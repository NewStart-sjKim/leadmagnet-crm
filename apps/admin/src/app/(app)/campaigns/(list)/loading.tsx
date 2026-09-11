// 목록은 route group (list) 으로 분리해 상세([id])와 다른 구간이 되게 한다.
// 그래야 목록 ↔ 상세 이동에서도 로딩 경계가 다시 켜진다 (같은 campaigns 구간 안 이동은 (app)/loading 이 잡지 못함).
export { default } from "../../loading";
