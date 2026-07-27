// Vercel 서버리스 함수 — 짧은 공유 링크(예: /?id=Ab3xK9zQ)를 만들기 위한 저장/조회 엔드포인트.
// 프로젝트 JSON을 통째로 URL에 욱여넣는 대신, 여기서 Upstash Redis(REST API)에 저장해두고
// 짧은 랜덤 id만 URL에 붙임. 프론트엔드(src/lib/share.ts)에서 이 엔드포인트를 호출함.
//
// 필요한 환경변수 (Vercel 프로젝트 설정 > Environment Variables 에 추가):
//   UPSTASH_REDIS_REST_URL   - Upstash Redis REST API 기본 URL
//   UPSTASH_REDIS_REST_TOKEN - Upstash Redis REST API 토큰
// (Vercel 대시보드 > 프로젝트 > Storage 탭에서 Upstash Redis 연동하면 이 두 값이 자동으로
//  환경변수에 채워짐. 아니면 upstash.com에서 무료 DB 만들고 REST URL/TOKEN을 직접 복사해도 됨.)
//
// 이 파일은 순수 Node/JS만 써서 별도 npm 패키지(@vercel/node 등) 설치 없이 그대로 동작함
// (Vercel이 api/ 폴더 밑의 함수를 프레임워크 상관없이 자동으로 인식해서 배포해줌).

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 8;
// 남용/저장공간 낭비 방지용 대략적인 상한(넉넉하게 200KB) — 어차피 마디를 무한정 늘릴 순 없어서
// 정상적인 프로젝트라면 여기 훨씬 못 미침.
const MAX_PAYLOAD_BYTES = 200_000;
// 한 달 넘게 안 열어본 공유 링크는 자동 만료(Redis TTL, 초 단위) — 무료 티어 저장공간을 계속
// 잡아먹지 않게 하기 위함.
const TTL_SECONDS = 60 * 60 * 24 * 90; // 90일

function makeId() {
  let id = "";
  for (let i = 0; i < ID_LENGTH; i += 1) {
    id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return id;
}

function getEnv() {
  // Vercel Storage 탭에서 Upstash를 마켓플레이스로 연동하면 KV_REST_API_URL/KV_REST_API_TOKEN
  // 이름으로 환경변수가 붙고, Upstash 계정에서 직접 연동/복사하면 UPSTASH_REDIS_REST_URL/
  // UPSTASH_REDIS_REST_TOKEN 이름으로 붙음 — 둘 다 지원하게 해서 어느 쪽으로 설정해도 동작하게 함.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisSet(env, key, value, ttlSeconds) {
  const res = await fetch(
    `${env.url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${ttlSeconds}`,
    { headers: { Authorization: `Bearer ${env.token}` } },
  );
  if (!res.ok) throw new Error(`redis SET failed: ${res.status}`);
}

async function redisGet(env, key) {
  const res = await fetch(`${env.url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${env.token}` },
  });
  if (!res.ok) throw new Error(`redis GET failed: ${res.status}`);
  const data = await res.json();
  return data.result ?? null;
}

export default async function handler(req, res) {
  const env = getEnv();
  if (!env) {
    res.status(503).json({
      error: "share backend not configured (missing KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN env vars)",
    });
    return;
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
      if (Buffer.byteLength(body, "utf-8") > MAX_PAYLOAD_BYTES) {
        res.status(413).json({ error: "payload too large" });
        return;
      }
      const id = makeId();
      await redisSet(env, `song:${id}`, body, TTL_SECONDS);
      res.status(200).json({ id });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
    return;
  }

  if (req.method === "GET") {
    const id = req.query?.id;
    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "missing id" });
      return;
    }
    try {
      const value = await redisGet(env, `song:${id}`);
      if (value === null) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.status(200).send(value);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}
