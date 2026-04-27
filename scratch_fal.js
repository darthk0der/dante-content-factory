import dotenv from 'dotenv';
dotenv.config();

async function testQueue() {
  const model = 'fal-ai/kling-video/v1/standard/text-to-video';
  try {
    const res = await fetch(`https://queue.fal.run/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "A cinematic test video",
        aspect_ratio: "16:9"
      }),
    });
    const data = await res.json();
    console.log("Queue Submission Response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.request_id) {
        const reqId = data.request_id;
        const statusRes = await fetch(`https://queue.fal.run/${model}/requests/${reqId}/status`, {
            headers: { Authorization: `Key ${process.env.FAL_API_KEY}` }
        });
        console.log("\nQueue Status Response:");
        console.log(JSON.stringify(await statusRes.json(), null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

testQueue();
