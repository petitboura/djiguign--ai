"use client";

import { useState } from "react";

export function ChampMotDePasse({
  id,
  value,
  onChange,
  label = "Mot de passe",
  autoComplete = "current-password",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-dj-texte-muet">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 pr-16 text-dj-texte outline-none focus:border-dj-accent-1"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-dj-texte-muet hover:text-dj-texte"
        >
          {visible ? "Masquer" : "Afficher"}
        </button>
      </div>
    </div>
  );
}
