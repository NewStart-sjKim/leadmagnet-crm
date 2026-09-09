/*
 * 리드마그넷 브릿지 스크립트 (ADR-0003)
 * 업로드된 HTML 안의 첫 <form> 제출을 가로채 JSON 으로 이 origin 의 제출 API 에 보낸다.
 * 운영자의 HTML 에 요구하는 것은 <form> 과 name 속성이 있는 입력 필드뿐이다.
 */
(function () {
  "use strict";
  var cfg = window.__LM_FORM__;
  if (!cfg) return;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function collect(form) {
    var fd = new FormData(form);
    var out = {};
    fd.forEach(function (value, key) {
      if (typeof value !== "string") return; // 파일 업로드는 지원하지 않음
      if (key in out) {
        if (!Array.isArray(out[key])) out[key] = [out[key]];
        out[key].push(value);
      } else {
        out[key] = value;
      }
    });
    return out;
  }

  function notice(form, text, kind) {
    var el = form.querySelector("[data-lm-notice]");
    if (!el) {
      el = document.createElement("div");
      el.setAttribute("data-lm-notice", "");
      el.setAttribute("role", "status");
      el.style.cssText = "margin-top:12px;padding:10px 12px;border-radius:8px;font-size:14px;line-height:1.5";
      form.appendChild(el);
    }
    el.style.background = kind === "error" ? "#fef2f2" : "#f0fdf4";
    el.style.color = kind === "error" ? "#b91c1c" : "#166534";
    el.textContent = text;
  }

  function success(form, message) {
    var box = document.createElement("div");
    box.setAttribute("data-lm-success", "");
    box.style.cssText = "padding:32px 20px;text-align:center;font-size:16px;line-height:1.6";
    box.textContent = message;
    form.replaceWith(box);
    document.dispatchEvent(new CustomEvent("lm:submitted", { detail: { message: message } }));
  }

  ready(function () {
    var form = document.querySelector("form");
    if (!form) return;
    form.setAttribute("data-lm-bound", "");
    var busy = false;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (busy) return;

      if (cfg.preview) {
        notice(form, "미리보기 모드입니다. 실제 배포 링크에서만 신청이 접수됩니다.", "info");
        return;
      }

      var fields = collect(form);
      if (Object.keys(fields).length === 0) {
        notice(form, "폼에 name 속성이 있는 입력 필드가 없어 제출할 수 없습니다.", "error");
        return;
      }

      busy = true;
      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch("/api/public/forms/" + encodeURIComponent(cfg.slug) + "/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code: cfg.code || undefined, fields: fields }),
      })
        .then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok) throw new Error(body && body.error ? body.error : "제출에 실패했습니다");
            return body;
          });
        })
        .then(function (body) {
          success(form, body.message || cfg.successMessage || "신청이 완료되었습니다.");
        })
        .catch(function (err) {
          busy = false;
          if (submitBtn) submitBtn.disabled = false;
          notice(form, err.message || "제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "error");
        });
    }, true);
  });
})();
