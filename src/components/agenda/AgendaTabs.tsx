"use client";

import { useState } from "react";
import { CalendarDays, List } from "lucide-react";
import { AgendaDia } from "./AgendaDia";
import { AgendaView } from "./AgendaView";

const TABS = [
  { id: "hoje", label: "Hoje", icon: List },
  { id: "calendario", label: "Calendário", icon: CalendarDays },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AgendaTabs() {
  const [active, setActive] = useState<TabId>("hoje");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {active === "hoje" && <AgendaDia />}
      {active === "calendario" && <AgendaView />}
    </div>
  );
}
