async function test() {
  try {
    console.log("Sending request...");
    const res = await fetch("http://localhost:3000/api/generate-risk-section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: "LA CHANCLERIA",
        commercial_name: "LA CHANCLERIA",
        address: "AV. JUAREZ | PLAYA DEL CARMEN",
        activity: "ZAPATERIA",
        m2: "54",
        section: "externos"
      })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.slice(0, 500));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
test();
