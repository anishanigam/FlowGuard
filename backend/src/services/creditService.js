
export async function verifyCreditScore(mode = "SUCCESS", attempt = 1) {

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));

  if (mode === "ALWAYS_FAIL") {
    throw new Error("Credit service unavailable");
  }

  if (mode === "FAIL_ONCE" && attempt === 1) {
    throw new Error("Temporary credit service failure");
  }

  if (["SUCCESS", "FAIL_ONCE"].includes(mode)) {
    return {
      verified: true,
      provider: "Mock Credit Bureau",
      referenceId: `CREDIT-${Date.now()}`
    };
  }

  throw new Error("Invalid simulation mode");
}

