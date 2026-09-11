/**
 * 탭 전환 중에 보여줄 뼈대 화면.
 *
 * 관리자 페이지는 모두 요청마다 서버에서 렌더링되므로(force-dynamic) 이 경계가 없으면
 * 서버 응답이 다 올 때까지 이전 화면이 멈춘 것처럼 보였다 (운영에서 클릭 후 약 0.8초 무반응).
 * 경계가 있으면 Link prefetch 가 여기까지 미리 받아 두어, 클릭 즉시 사이드바 선택과 이 화면으로 바뀐다.
 *
 * role="status" 는 쓰지 않는다 — 템플릿 등록 결과 메시지가 status 역할이라 겹치지 않게 aria-busy 로 표시한다.
 * 크기는 PageHeader · StatTiles 와 맞춰 콘텐츠로 바뀔 때 화면이 덜 흔들리게 한다.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="animate-pulse" data-testid="page-loading">
      <span className="sr-only">불러오는 중…</span>

      <div className="mb-6">
        <div className="h-8 w-44 rounded-md bg-neutral-200" />
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-neutral-100" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-12 rounded bg-neutral-100" />
            <div className="mt-2 h-7 w-16 rounded bg-neutral-200" />
          </div>
        ))}
      </div>

      <div className="card mt-8 divide-y divide-neutral-100">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-4 w-1/3 rounded bg-neutral-200" />
            <div className="h-4 flex-1 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
