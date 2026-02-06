"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import PageTransition from "@/components/PageTransition";
import { parseCSV, isValidPhone } from "@/lib/utils";

export default function NewCampaignPage() {
  const router = useRouter();
  const { createCampaign, launchCampaign, showToast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [manualNumber, setManualNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [saving, setSaving] = useState(false);

  const charCount = message.length;
  const segments = Math.ceil(charCount / 160) || 0;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const nums = parseCSV(text);
      setRecipients(nums);
      if (nums.length === 0) {
        showToast("No valid phone numbers found in CSV");
      }
    };
    reader.readAsText(file);
  };

  const valid = name && message && recipients.length > 0;

  const handleLaunch = async () => {
    if (!valid) return;
    setSaving(true);

    const campaign = createCampaign({
      name,
      message,
      recipients,
      recipientCount: recipients.length,
      status: "running",
    });

    launchCampaign(campaign.id);
    setSaving(false);
    router.push("/queue");
  };

  const handleSaveDraft = () => {
    if (!name || !message) return;
    createCampaign({
      name,
      message,
      recipients,
      recipientCount: recipients.length,
      status: "draft",
    });
    showToast("Saved as draft");
    router.push("/campaigns");
  };

  return (
    <PageTransition>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-fg">New campaign</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            Send real SMS via httpSMS
          </p>
        </div>

        {/* Details */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm text-fg-secondary mb-1.5">
              Campaign name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. January Promo"
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input min-h-[100px] resize-none"
              placeholder="Your SMS message..."
              maxLength={640}
            />
            <div className="flex justify-between mt-1.5 text-xs text-fg-dim">
              <span>{charCount} chars</span>
              <span>
                {segments} segment{segments !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="card p-5">
          <label className="block text-sm text-fg-secondary mb-3">
            Recipients
          </label>
          <input
            type="file"
            ref={fileRef}
            className="hidden"
            accept=".csv,.txt"
            onChange={handleFile}
          />

          {/* Manual number input */}
          <div className="flex gap-2">
            <input
              type="tel"
              value={manualNumber}
              onChange={(e) => {
                setManualNumber(e.target.value);
                if (phoneError) setPhoneError("");
              }}
              className="input flex-1"
              placeholder="+1 555 123 4567"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const num = manualNumber.trim();
                  if (!num) return;
                  if (!isValidPhone(num)) {
                    setPhoneError("Invalid phone number format");
                    return;
                  }
                  if (!recipients.includes(num)) {
                    setRecipients((prev) => [...prev, num]);
                  }
                  setManualNumber("");
                  setPhoneError("");
                }
              }}
            />
            <button
              onClick={() => {
                const num = manualNumber.trim();
                if (!num) return;
                if (!isValidPhone(num)) {
                  setPhoneError("Invalid phone number format");
                  return;
                }
                if (!recipients.includes(num)) {
                  setRecipients((prev) => [...prev, num]);
                }
                setManualNumber("");
                setPhoneError("");
              }}
              disabled={!manualNumber.trim()}
              className="btn-secondary disabled:opacity-30"
            >
              Add
            </button>
          </div>
          {phoneError && (
            <p className="text-xs text-fg-muted mt-1">{phoneError}</p>
          )}

          {/* CSV upload */}
          {recipients.length === 0 ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-edge-strong rounded-md p-4 text-center hover:border-fg-muted hover:bg-surface-raised/30 transition-colors"
            >
              <p className="text-xs text-fg-muted">or upload CSV</p>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-fg-dim">
                  {recipients.length} number{recipients.length !== 1 ? "s" : ""}
                  {fileName && <span> (from {fileName})</span>}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs text-fg-dim hover:text-fg transition-colors"
                  >
                    Add CSV
                  </button>
                  <button
                    onClick={() => {
                      setRecipients([]);
                      setFileName("");
                    }}
                    className="text-xs text-fg-dim hover:text-fg transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recipients.map((num, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-surface-raised rounded text-xs text-fg-secondary font-mono"
                  >
                    {num}
                    <button
                      onClick={() =>
                        setRecipients((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-fg-dim hover:text-fg ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => router.push("/campaigns")}
            className="btn-secondary"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={!name || !message || saving}
              className="btn-secondary disabled:opacity-30"
            >
              Save draft
            </button>
            <button
              onClick={handleLaunch}
              disabled={!valid || saving}
              className="btn-primary disabled:opacity-30"
            >
              {saving ? "Launching..." : "Launch"}
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
