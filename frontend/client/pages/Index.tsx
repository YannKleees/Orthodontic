import { apiClient, apiUtils } from "@/lib/api";
import { useState } from "react";
import { IconSidebar } from "../components/IconSidebar";
import { PatientSidebar } from "../components/PatientSidebar";
import { PatientTabs } from "../components/PatientTabs";
import PatientCards from "../components/PatientCards";
import AddVisitForm from "@/components/AddVisitForm";
import { AddPatientForm } from "../components/AddPatientForm";
import { MosaicFullscreen } from "../components/MosaicFullscreen";
import { VisitsTab } from "../components/VisitsTab";
import { ReportsTab } from "../components/ReportsTab";
import { DentalImageUpload } from "../components/DentalImageUpload";
import { DentalMosaicWorkspace } from "../components/DentalMosaicWorkspace";
import { BulkProcessing } from "../components/BulkProcessing";
import { SidebarPanels } from "../components/SidebarPanels";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { usePatients } from "../hooks/useApi";
import { PARComponentsProvider } from "../hooks/usePARComponentsContext";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
export interface Tab {
  id: string;
  name: string;
  type:
    | "patient"
    | "visit"
    | "add-patient"
    | "mosaic"
    | "visits"
    | "reports"
    | "similarity"
    | "upload"
    | "workspace"
    | "bulk-processing";
  patientId?: string;
  patientName?: string;
  visitId?:    string;
  compareTo?: string;
}

export default function Index() {
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("patients");
  const queryClient            = useQueryClient();  
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  // Handle section changes - open appropriate sidebars
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarExpanded(true); // Always open sidebar when switching sections
  };

  // Get dynamic patient data from API
  const { data: patientsData, loading: patientsLoading, refetch: refetchPatients} = usePatients();
  useEffect(() => {
    const handleScoreUpdate = () => {
      refetchPatients();
    };
    window.addEventListener("par-score-updated", handleScoreUpdate);
    return () => {
      window.removeEventListener("par-score-updated", handleScoreUpdate);
    };
  }, [refetchPatients]);
  // Add null/empty check
  const availablePatients = patientsData && Array.isArray(patientsData) && patientsData.length > 0
    ? patientsData.map((p) =>  ({
        id: p.id,
        name: p.name,
        age: p.age,
        condition: p.condition,
        visits: p.visits ?? [],
        parScore: p.currentPARScore ?? p.parScore ?? 0,
        currentPARScore: p.currentPARScore ?? p.parScore ?? 0,
        treatmentUrgency: p.treatmentUrgency ?? "low",
      }))
    : [];

  const handleOpenPatientTab = (patientId: string, patientName: string) => {
    // Check if tab is already open
    const existingTab = openTabs.find((tab) => tab.id === patientId);
    if (existingTab) {
      setActiveTabId(patientId);
      return;
    }

    // Add new tab
    const newTab: Tab = {
      id: patientId,
      name: patientName,
      type: "patient",
      patientId: patientId,
      patientName: patientName,
    };

    setOpenTabs((prev) => [...prev, newTab]);
    setActiveTabId(patientId);
  };

  const handleCloseTab = (tabId: string) => {
    setOpenTabs((prev) => prev.filter((tab) => tab.id !== tabId));

    // If we're closing the active tab, switch to another one
    if (activeTabId === tabId) {
      const remainingTabs = openTabs.filter((tab) => tab.id !== tabId);
      if (remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[remainingTabs.length - 1].id);
      } else {
        setActiveTabId(null);
      }
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleAddVisit = (patientId: string) => {
    const patInfo = availablePatients.find(p => p.id === patientId);
    if (!patInfo) return;

    const visitId = `visit-${Date.now()}`;
    const visitTab: Tab = {
      id: visitId,
      name: `Add Visit - ${patInfo.name}`,
      type: "visit",
      patientId: patientId,
    };

    setOpenTabs((prev) => [...prev, visitTab]);
    setActiveTabId(visitId);
  };

  const handleVisitSave = (visitId: string) => {
    /* 1  close the temporary wizard tab */
    if (activeTab?.type === "visit") handleCloseTab(activeTab.id);

    /* 2  focus (or create) the PATIENT dashboard tab */
    const pid   = activeTab?.patientId ?? activeTab?.id!;
    const pname = activeTab?.patientName ?? activeTab?.name ?? "Patient";

    const existing = openTabs.find(t => t.type==="patient" && t.id===pid);
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      setOpenTabs(prev => [
        ...prev,
        { id:pid, name:pname, type:"patient", patientId:pid, patientName:pname }
      ]);
      setActiveTabId(pid);
    }
  };

  const handleAddPatient = () => {
    const addPatientTab: Tab = {
      id: `add-patient-${Date.now()}`,
      name: "Add New Patient",
      type: "add-patient",
    };

    setOpenTabs((prev) => [...prev, addPatientTab]);
    setActiveTabId(addPatientTab.id);
  };

const handlePatientSave = async (formData: { name: string; dateOfBirth: string }) => {
  try {
    const { success, data } = await apiClient.createPatient({
      name:        formData.name,
      dateOfBirth: formData.dateOfBirth,
      age:         0,
      visits:      [],
      createdAt:   new Date().toISOString(),
      status:      "Active",
    });
    if (!success) throw new Error("API failed");

    await refetchPatients();
    const pid = data.id;
    const pname = data.name;
    
    // Close the Add Patient form/tab
    if (activeTab?.type === "add-patient") handleCloseTab(activeTab.id);
    
    // Open the Upload window as the only tab and make it active
    const uploadTabId = `upload-${pid}`;
    setOpenTabs(prev => {
      // Filter out any existing upload tab for this patient
      const filtered = prev.filter(t => !(t.type === "upload" && t.patientId === pid));
      // Add the new upload tab
      return [...filtered, {
        id: uploadTabId,
        name: `Upload Images - ${pname}`,
        type: "upload",
        patientId: pid,
        patientName: pname,
      }];
    });
    setActiveTabId(uploadTabId);

    // Alert the user
  } catch (err) {
    console.error(err);
    alert("Failed to add patient");
  }
};

  const handleOpenMosaicFullscreen = (
    patientId: string,
    patientName: string,
    visitId?: string    
  ) => {
    const targetVisit = visitId || "latest";
    const existingTab = openTabs.find(
     (tab) =>
       tab.type === "mosaic" &&
       tab.patientId === patientId &&
       tab.visitId   === targetVisit
   );

    if (!existingTab) {
      const newTab: Tab = {
        id: `mosaic-${patientId}-${visitId || "latest"}`,
        name: `Mosaic - ${patientName}`,
        type: "mosaic",
        patientId: patientId,
        patientName: patientName,
        visitId : targetVisit,
      };

      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } else {
      setActiveTabId(existingTab.id);
    }
  };
  // Index.tsx  (inside the component, right next to handleOpenMosaicFullscreen)

  /** Called by <SidebarPanels section="visits" … onVisitClick /> */
const handleOpenVisit = (
  visitId: string,
  patientId: string,
  patientName: string
) => {
  /*───────────────────────────────────────────────────────────*
   * 1  If a patient dashboard tab is already open, just focus
   *    it **and** remember which visit should be displayed.   *
   *───────────────────────────────────────────────────────────*/
  const existing = openTabs.find(t => t.type === "patient" && t.id === patientId);
    if (existing) {
    existing.compareTo = existing.visitId; 
    existing.visitId   = visitId;     // ✱  set / overwrite the target visit
    setActiveTabId(existing.id);
    // forcing a re‑render because we mutated an object inside state
    setOpenTabs([...openTabs]);
    return;
    }

  /*───────────────────────────────────────────────────────────*
   * 2  Otherwise create a fresh patient dashboard tab that
   *    already points at the requested visit.                 *
   *───────────────────────────────────────────────────────────*/
  const newTab: Tab = {
        id: patientId,
        name: patientName,
        type: "patient",
        patientId,
        patientName,
    visitId,                        // ✱  carried over
  };
  setOpenTabs(prev => [...prev, newTab]);
  setActiveTabId(newTab.id);
};


  // helpers for the new visit‑to‑workspace flow
  const makeWorkspaceTab = (
    visitId: string,
    patientId: string,
    patientName: string
  ): Tab => ({
    id: `workspace-${visitId}`,             // unique per visit
    name: `Dental Analysis – ${patientName}`,
    type: "workspace",
    patientId,
    patientName,
  });
  const focusOrCreateWorkspace = (
    visitId: string,
    patientId: string,
    patientName: string
  ) => {
    const tabId = `workspace-${visitId}`;
    const existing = openTabs.find(t => t.id === tabId);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newTab = makeWorkspaceTab(visitId, patientId, patientName);
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleOpenImageUpload = (patientId: string, patientName: string) => {
    const existingTab = openTabs.find(
      (tab) => tab.type === "upload" && tab.patientId === patientId,
    );

    if (!existingTab) {
      const newTab: Tab = {
        id: `upload-${patientId}`,
        name: `Upload Images - ${patientName}`,
        type: "upload",
        patientId: patientId,
        patientName: patientName,
      };

      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } else {
      setActiveTabId(existingTab.id);
    }
  };  
  /* ▸ AFTER – go straight to the *normal* patient dashboard             */
/*            and show the brand‑new visit, no AI workspace tab.       */
const handleUploadCompleted = async (visitId: string) => {
  if (!activeTab || activeTab.type !== "upload") return;

  /* 1 — refresh sidebar so the new visit appears immediately */
  await refetchPatients?.();

  /* 2 — open (or refresh) the patient dashboard tab */
  const pid = activeTab.patientId!;
  queryClient.invalidateQueries({ queryKey: ["visits", pid] });
  queryClient.invalidateQueries({ queryKey: ["patient", pid] });
  const pname = activeTab.patientName!;

  setOpenTabs(prev => {
    const existing = prev.find(t => t.type === "patient" && t.id === pid);

    /* dashboard already open → replace with fresh object that
       carries the *new* visitId so React re‑renders               */
    if (existing) {
      const updated = { ...existing, visitId };
      return prev.map(t => (t.id === existing.id ? updated : t));
    }

    /* otherwise create a brand‑new dashboard tab */
    return [
      ...prev,
      {
        id: pid,
        name: pname,
        type: "patient",
        patientId: pid,
        patientName: pname,
        visitId,                      // ← highlight the latest visit
      } as Tab,
    ];
  });

  /* 3 — activate the dashboard tab (id === patientId) */
  setActiveTabId(pid);

  /* 4 — finally close the temporary “Upload” tab */
  setOpenTabs(prev => prev.filter(t => t.id !== activeTab.id));
};
  const handlePatientsClick = () => {
    if (activeSection === "patients") {
      setSidebarExpanded(!sidebarExpanded);
    } else {
      setActiveSection("patients");
      setSidebarExpanded(true);
    }
  };

  const handleSearchClick = () => {
    setActiveSection("patients");
    setSidebarExpanded(true);
    // Auto-focus the search when opened via search icon
    setTimeout(() => {
      const searchButton = document.querySelector("[data-search-toggle]");
      if (searchButton) {
        (searchButton as HTMLElement).click();
      }
    }, 100);
  };

  const handleCloseSidebarPanel = () => {
    setActiveSection("patients");
  };

  const activeTab = openTabs.find(t => t.id === activeTabId);


  return (
    <div className="min-h-screen bg-background">
      <IconSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onPatientsClick={handlePatientsClick}
        onSearchClick={handleSearchClick}
        hasSelectedPatient={!!activeTab}
        patientCount={patientsLoading ? 0 : availablePatients.length}
      />

      {activeSection === "patients" && (
        <PatientSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          availablePatients={availablePatients}
          onPatientClick={handleOpenPatientTab}
          onAddPatient={handleAddPatient}
          selectedPatientId={
            activeTab?.type === "patient" ? activeTab.id : undefined
          }
        />
      )}

      {activeSection === "visits" && activeTab && (
        <SidebarPanels
          section="visits"
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          patientName={activeTab.patientName || activeTab.name}
          patientId={activeTab.patientId || activeTab.id}
          onVisitClick={handleOpenVisit}
          onItemClick={handleOpenPatientTab}
          onVisitCreated={(_vid)=>{
            const pid   = activeTab.patientId || activeTab.id;
            const pname = activeTab.patientName || activeTab.name;
            const existing = openTabs.find(t => t.type==="patient" && t.id===pid);
            if (existing) setActiveTabId(existing.id);
            else {
              setOpenTabs(prev=>[
                ...prev,
                { id:pid, name:pname, type:"patient", patientId:pid, patientName:pname }
              ]);
              setActiveTabId(pid);
            }
          }}
        />
      )}


      {activeSection === "similarity" && activeTab && (
        <SidebarPanels
          section="similarity"
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          patientName={activeTab.patientName || activeTab.name}
          patientId={activeTab.patientId || activeTab.id}
          onItemClick={handleOpenPatientTab}
          onVisitClick={handleOpenVisit} 
        />
      )}

      <div className="flex">
        {/* Main Content - Always show patient cards */}
        <div
          className={cn(
            "flex-1 transition-all duration-300",
            sidebarExpanded &&
              (activeSection === "patients" ||
                activeSection === "visits" ||
                activeSection === "similarity")
              ? "ml-[440px]"
              : "ml-20",
          )}
        >
          {/* Tabs Bar - Always at top when tabs exist */}
          {openTabs.length > 0 && (
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <PatientTabs
                    tabs={openTabs}
                    activeTabId={activeTabId}
                    onTabChange={handleTabChange}
                    onTabClose={handleCloseTab}
                  />
                </div>
                {activeTab?.type === "patient" && (
                  <div>
                    <Button
                      onClick={() =>
                        handleOpenImageUpload(activeTab.id, activeTab.name)
                      }
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-2 text-sm font-medium"
                    >
                      Add Visit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-6 max-w-full overflow-hidden">
            {/* Main Content */}
            <div className="flex justify-center">
              {activeTab ? (
                activeTab.type === "patient" ? (
                  <PARComponentsProvider patientId={activeTab.id} visitId={activeTab.visitId}>
                    <PatientCards
                      patientId={activeTab.patientId || activeTab.id}
                      patientName={activeTab.patientName || activeTab.name}
                      visitId={activeTab.visitId}
                      onOpenFull={(pid, pname, vid) => handleOpenMosaicFullscreen(pid, pname, vid)}
                    />
                  </PARComponentsProvider>
                ) : activeTab.type === "visit" ? (
                  <AddVisitForm
                    patientId={activeTab.patientId!}
                    patientName={
                      availablePatients.find(
                        (p) => p.id === activeTab.patientId,
                      )?.name || ""
                    }
                    onSave={handleVisitSave}
                    onCancel={() => handleCloseTab(activeTab.id)}
                  />
                ) : activeTab.type === "add-patient" ? (
                  <AddPatientForm
                    onSave={handlePatientSave}
                    onCancel={() => handleCloseTab(activeTab.id)}
                  />
                ) : activeTab.type === "mosaic" ? (
                 (
                   <PARComponentsProvider
                       patientId={activeTab.patientId!}
                       visitId={activeTab.visitId}
                   >
                     <MosaicFullscreen
                       patientName={activeTab.patientName!}
                       patientId={activeTab.patientId!}
                       visitId={activeTab.visitId! /* we always have it when user clicks */ }
                     />
                   </PARComponentsProvider>
                 )
                ) : activeTab.type === "upload" ? (
                  <DentalImageUpload
                    patientId={activeTab.patientId!}   // <-- new prop
                    patientName={activeTab.patientName!}
                    onAllCompleted={handleUploadCompleted}
                  />
                ) : activeTab.type === "workspace" ? (
                  <PARComponentsProvider patientId={activeTab.patientId!} visitId={activeTab.visitId}>
                    <DentalMosaicWorkspace
                      patientId   ={activeTab.patientId!}
                      patientName ={activeTab.patientName!}
                      hasPrevisousVisit={!!activeTab.visitId}
                    />
                  </PARComponentsProvider>
                ) : activeTab.type === "bulk-processing" ? (
                  <BulkProcessing
                    onClose={() => handleCloseTab(activeTab.id)}
                  />
                ) : (
                  // For visits, reports, similarity - show patient cards
                  <PatientCards
                    patientId={activeTab.patientId || activeTab.id}
                    patientName={activeTab.patientName || activeTab.name}
                    visitId={activeTab.visitId}
                    onOpenFull={(pid, pname, vid) =>
                       handleOpenMosaicFullscreen(pid, pname, vid)
                     }
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">
                      No Patient Selected
                    </h3>
                    <p className="text-sm">
                      Select a patient from the sidebar to get started
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

