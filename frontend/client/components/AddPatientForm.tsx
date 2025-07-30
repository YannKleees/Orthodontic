import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, X } from "lucide-react";
import "./AddPatientForm.css";

interface AddPatientFormProps {
  onSave: (patient: { name: string; dateOfBirth: string }) => void;
  onCancel: () => void;
}

/** Floating‑label input with optional format hint */
function FloatingInput(props: {
  id: string;
  label: string;
  type?: string;
  value: string;
  required?: boolean;
  onChange: (v: string) => void;
  max?: string;
  formatHint?: string;          // ← new
}) {
  const {
    id,
    label,
    type = "text",
    value,
    required,
    onChange,
    max,
    formatHint,
  } = props;

  return (
    <div className="form-control">
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={e => onChange(e.target.value)}
        {...(max ? { max } : {})}
      />
      <label htmlFor={id}>
        {label.split("").map((ch, i) => (
          <span key={i} className="char" style={{ transitionDelay: `${i * 50}ms` }}>
            {ch}
          </span>
        ))}
        {formatHint && <span className="hint">({formatHint})</span>}
      </label>
    </div>
  );
}

export function AddPatientForm({ onSave, onCancel }: AddPatientFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
    ageLabel: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const calcAge = (dob: string) => {
    if (!dob) return "";
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age} years`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dateOfBirth) {
      alert("Please fill name and DOB");
      return;
    }
    
    setSubmitting(true);
    // We'll immediately call onSave so the parent component can handle the flow
    onSave({ name: formData.name, dateOfBirth: formData.dateOfBirth });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="w-5 h-5" /> Add New Patient
            </CardTitle>
            <button
              onClick={onCancel}
              className="p-1 rounded hover:bg-gray-100 transition"
              aria-label="Close form"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            {/* Full name */}
            <FloatingInput
              id="name"
              label="Full Name*"
              required
              value={formData.name}
              onChange={v => setFormData(f => ({ ...f, name: v }))}
            />

            {/* Date of birth – with format hint */}
            <FloatingInput
              id="dob"
              label="Date of Birth*"
              type="date"
              required
              max={new Date().toISOString().split("T")[0]}
              formatHint=""
              value={formData.dateOfBirth}
              onChange={v =>
                setFormData(f => ({
                  ...f,
                  dateOfBirth: v,
                  ageLabel: calcAge(v),
                }))
              }
            />

            {/* Age */}
            {formData.ageLabel && (
              <p className="text-sm font-medium text-gray-500 -mt-3 mb-6">
                Age: {formData.ageLabel}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              {/* primary – big, green */}
              <button
                type="submit"
                className="button flex-1"
                style={{ "--clr": "#7cbcf8ff" } as React.CSSProperties}
                disabled={submitting}
              >
                <span className="button-decor" />
                <div className="button-content">
                  <div className="button__icon">
                    <User className="w-100 h-100" />
                  </div>
                  <span className="button__text">
                    {submitting ? "Creating..." : "Create Patient"}
                  </span>
                </div>
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
