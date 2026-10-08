import { setTimeout } from "node:timers/promises";

const BASE = "http://localhost:8000/api";
const CONCURRENCY = 50;
const DURATION_MS = 5000;

let completed = 0;
let failed = 0;

async function run(end: number, token: string) {
  while (Date.now() < end) {
    try {
      const res = await fetch(`${BASE}/orders?pageSize=100&status=CANCELLED`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await res.text(); // release the connection
      if (res.status === 200) completed++;
      else failed++;
    } catch {
      failed++;
    }

    await setTimeout(4000);
  }
}

async function main() {
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tej@acedataanalytics.com", password: "P@ssw0rd" }),
  });

  const { jwt: token } = await login.json();
  const firstReqStartTime = new Date().getTime();

  const warm = await fetch(`${BASE}/orders?pageSize=100&status=CANCELLED`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await warm.text(); // release the connection

  console.log(`First Request Time--->${((new Date().getTime() - firstReqStartTime) / 1000)}, status: ${warm.status}`);

  const start = Date.now();
  const end = start + DURATION_MS;
  await Promise.all(Array.from({ length: CONCURRENCY }, () => run(end, token)));
  const secs = (Date.now() - start) / 1000;
  
  const total = failed + completed;

  console.log(`total requests: ${total}, success %: ${Math.ceil((completed/total)*100)}`);
  console.log(`concurrency ${CONCURRENCY}: ${(completed / secs).toFixed(0)} req/sec (${failed} failed)`);
}

async function f() {
  return 41;
}

main();

// console.log(f());


// async function a() { 
//   console.log(1); 
//   await b(); 
//   console.log(2); 
// } 

// async function b() {
//   // setTimeout(() => console.log(3),500); 
//   console.log(3); 
// } 

// a(); 
// console.log(4);

// 1 4 3 2
// 1 3 2 4

// import crypto from "crypto";

// async function a() {
//   console.log(1);
//   await b();
//   console.log(2);
// }

// async function b() {
//   const key = await crypto.hash("sha256", "password");
//   // const n = key.readUInt32BE(0); // some 32-bit number
//   console.log(key);
// }

// a();
// console.log(4);