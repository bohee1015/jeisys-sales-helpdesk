import JeisysLogo from "./JeisysLogo";
import LogoutButton from "./LogoutButton";
import NavTabs from "./NavTabs";

type AppHeaderProps = {
  title: string;
  description: string;
  userName: string;
  /** 관리자 전용 탭(관리자 화면, 요청 현황판)을 보여줄지 */
  isAdmin?: boolean;
};

/** 모든 화면이 같은 브랜드 헤더(Jeisys 워드마크 + 탭)를 쓰도록 공용화한다. */
export default function AppHeader({ title, description, userName, isAdmin = false }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <JeisysLogo className="h-5" />
          <span className="h-3.5 w-px bg-slate-300 dark:bg-slate-700" />
          <span className="text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400">
            헬프데스크
          </span>
        </div>
        <LogoutButton userLabel={userName} />
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>

      <NavTabs isAdmin={isAdmin} />
    </header>
  );
}
