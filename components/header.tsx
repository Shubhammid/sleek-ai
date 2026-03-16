"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { DarkModeToggle } from "./dark-mode-toggle";
import { Logo } from "./logo";

const Header = () => {
  const pathname = usePathname();

  const isProjectPage = pathname.startsWith("/project/");

  return (
    <header className="w-full">
      <div
        className={cn(
          `w-full flex py-3.5 px-8
         items-center justify-between
         `,
          isProjectPage && "absolute top-0 z-50 px-2 py-1 right-0 w-auto",
        )}
      >
        <div>
          {!isProjectPage && <Logo/>}
        </div>
        <div className="flex items-center justify-end gap-3">
        <DarkModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
