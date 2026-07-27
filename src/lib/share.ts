// 공유 링크 만들기 — 3가지 형식을 지원함(우선순위 순):
//   #id=xxxxxxxx  : 서버(api/share.js + Upstash Redis)에 데이터를 저장하고 짧은 id만 URL에 붙임.
//                   크롬 뮤직랩 Song Maker랑 같은 방식(뒤에 자세히 설명). 서버가 설정 안 돼있거나
//                   요청이 실패하면 아래 압축 방식으로 자동 폴백함.
//   #z=...        : 서버 없이 브라우저 내장 CompressionStream(deflate-raw)로 압축 + base64url
//                   인코딩해서 URL 자체에 데이터를 담음. 서버 저장이 안 될 때의 폴백.
//   #data=...     : 예전 방식(압축 없이 base64만). 이미 공유된 옛날 링크 호환용으로만 남겨둠.
export async function encodeProjectToUrl(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload);

  const serverUrl = await tryCreateServerShareLink(json);
  if (serverUrl) return serverUrl;

  const compressed = await deflateCompress(json);
  const encoded = bytesToBase64Url(compressed);
  return `${location.origin}${location.pathname}#z=${encoded}`;
}

export async function decodeProjectFromHash<T>(): Promise<T | null> {
  const idMatch = location.hash.match(/[#&]id=([^&]+)/);
  if (idMatch) {
    const json = await fetchServerSharedJson(idMatch[1]);
    if (json) {
      try {
        return JSON.parse(json) as T;
      } catch {
        return null;
      }
    }
    // 서버에서 못 찾았거나 실패했으면 다른 형식도 아니니 그냥 실패 처리.
    return null;
  }

  const zMatch = location.hash.match(/[#&]z=([^&]+)/);
  if (zMatch) {
    try {
      const bytes = base64UrlToBytes(zMatch[1]);
      const json = await deflateDecompress(bytes);
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }

  // 예전 방식(#data=...)으로 이미 공유된 링크도 계속 열리게 하기 위한 하위 호환 처리.
  const oldMatch = location.hash.match(/[#&]data=([^&]+)/);
  if (oldMatch) {
    try {
      const json = decodeURIComponent(escape(atob(oldMatch[1])));
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }

  return null;
}

// --- 서버(짧은 링크) ---

async function tryCreateServerShareLink(json: string): Promise<string | null> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
    });
    if (!res.ok) {
      // 실패 이유를 콘솔에 남겨서 왜 압축 링크로 폴백됐는지 바로 확인할 수 있게 함
      // (예: 503 = 서버에 KV 환경변수가 아직 안 잡힘, 500 = redis 호출 자체가 실패함).
      const bodyText = await res.text().catch(() => "");
      console.error(`[share] /api/share POST failed: ${res.status} ${bodyText}`);
      return null;
    }
    const data = (await res.json()) as { id?: string };
    if (!data.id) {
      console.error("[share] /api/share POST returned no id", data);
      return null;
    }
    return `${location.origin}${location.pathname}#id=${data.id}`;
  } catch (err) {
    // 네트워크 에러 등 — 호출부에서 압축 링크로 폴백함.
    console.error("[share] /api/share POST threw", err);
    return null;
  }
}

async function fetchServerSharedJson(id: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// --- 압축(서버 폴백) ---
// 브라우저 내장 CompressionStream/DecompressionStream만 써서 외부 라이브러리 없이 압축함.
// gzip 대신 deflate-raw를 쓰는 이유: gzip은 헤더/체크섬으로 ~18바이트 고정 오버헤드가 붙는데,
// 작은 패턴(노트 적은 간단모드 곡 등)일수록 이 오버헤드 비중이 커져서 압축 이득이 줄어듦 —
// deflate-raw는 그 오버헤드가 없어서 작은 데이터에서도 더 유리함.

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const padded = base64url + "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deflateCompress(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function deflateDecompress(bytes: Uint8Array): Promise<string> {
  // 최신 TS lib 타입에서 Uint8Array<ArrayBufferLike>가 BlobPart(ArrayBuffer 한정)랑
  // 제네릭이 안 맞아서 나는 타입 에러라 캐스팅으로 우회함 — 런타임에서는 Blob이 원래
  // TypedArray를 그대로 받아들여서 문제 없음.
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buffer);
}
