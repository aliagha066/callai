"use client";

import { AuthControls } from "@/components/AuthControls";
import { useAuthUI } from "@/components/AuthUIProvider";
import { UserSettingsControls } from "@/components/UserSettingsControls";

export function AuthNavbarArea() {
  const { user } = useAuthUI();

  return (
    <>
      <div className="hidden items-center gap-2 sm:flex">
        <UserSettingsControls />
        <AuthControls />
        {!user ? (
          <span className="text-xs font-medium text-white/55">
            Login • Save chats & sync across devices
          </span>
        ) : null}
      </div>
      <div className="sm:hidden">
        <UserSettingsControls />
        <AuthControls />
      </div>
    </>
  );
}

