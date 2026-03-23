const http = require('http');

const tasks = [
  { title: 'Agent Dashboard — пиксельный офис с агентами', priority: 'high', assignee: 'Dev' },
  { title: 'CourseAI — Next.js платформа с Anthropic SDK, Prisma, Stripe, auth', priority: 'high', assignee: 'Dev' },
];

async function post(task) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(task);
    const req = http.request({
      hostname: 'localhost', port: 3737, path: '/api/mytasks',
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { console.log(data); resolve(); });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => { for (const t of tasks) await post(t); })();
