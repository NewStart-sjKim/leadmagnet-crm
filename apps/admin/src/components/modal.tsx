"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * 네이티브 <dialog> 기반 모달.
 * Esc 닫기 · 포커스 트랩 · 최상위 레이어(top layer)를 브라우저가 처리하므로 직접 구현하지 않는다.
 * 배경(backdrop) 클릭만 수동으로 처리한다 — dialog 자신이 클릭 대상이면 배경이다.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  // 열려 있는 동안 뒤쪽 스크롤을 막는다
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-neutral-900/40"
    >
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="cursor-pointer rounded-md px-2 py-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          ✕
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
