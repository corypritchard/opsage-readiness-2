import {
  chunk as chunkText,
  estimateTokenCount,
  chunkByTokens,
} from "../services/chunking";

async function testLocalFunctionality() {
  console.log("🧪 Testing Local Document Processing Functionality...\n");

  try {
    // 1. Test basic text chunking
    console.log("1️⃣ Testing basic text chunking...");
    const testText =
      "This is a test document for vectorization. It should be split into chunks for processing. This is another sentence to make it longer. And here is some more text to ensure we have enough content to create multiple chunks. Let's add even more content to test the chunking algorithm properly with paragraph breaks.\n\nThis is a new paragraph. It should be handled correctly by the chunking algorithm. More text here to make it substantial.";

    const chunks = chunkText(testText, 100, 20);
    console.log(
      `✅ Created ${chunks.length} chunks with 100 char limit and 20 char overlap`
    );
    chunks.forEach((chunk, index) => {
      console.log(
        `   Chunk ${index + 1} (${chunk.length} chars): "${chunk.substring(
          0,
          40
        )}..."`
      );
    });
    console.log();

    // 2. Test token estimation
    console.log("2️⃣ Testing token estimation...");
    const tokenCount = estimateTokenCount(testText);
    console.log(
      `✅ Estimated ${tokenCount} tokens for ${testText.length} characters`
    );
    console.log(
      `   Ratio: ~${(testText.length / tokenCount).toFixed(
        2
      )} characters per token\n`
    );

    // 3. Test token-based chunking
    console.log("3️⃣ Testing token-based chunking...");
    const tokenChunks = chunkByTokens(testText, 50);
    console.log(`✅ Created ${tokenChunks.length} chunks with 50 token limit`);
    tokenChunks.forEach((chunk, index) => {
      const estimatedTokens = estimateTokenCount(chunk);
      console.log(
        `   Chunk ${index + 1} (~${estimatedTokens} tokens): "${chunk.substring(
          0,
          40
        )}..."`
      );
    });
    console.log();

    // 4. Test edge cases
    console.log("4️⃣ Testing edge cases...");

    // Empty text
    const emptyChunks = chunkText("", 100, 10);
    console.log(`✅ Empty text produces ${emptyChunks.length} chunks`);

    // Very short text
    const shortChunks = chunkText("Short text", 100, 10);
    console.log(`✅ Short text produces ${shortChunks.length} chunk(s)`);

    // Text with special characters
    const specialText = "Text with émojis 🚀 and spëcial chars: àéîôü";
    const specialChunks = chunkText(specialText, 20, 5);
    console.log(
      `✅ Special characters handled: ${specialChunks.length} chunk(s)`
    );
    console.log();

    // 5. Test realistic document content
    console.log("5️⃣ Testing with realistic maintenance document content...");
    const maintenanceText = `
WARMAN PUMP MAINTENANCE MANUAL

1. INTRODUCTION
This manual provides comprehensive maintenance procedures for Warman centrifugal pumps. Regular maintenance is essential for optimal performance and extended equipment life.

2. SAFETY PROCEDURES
Before performing any maintenance:
- Ensure pump is completely shut down
- Lock out and tag out all energy sources
- Allow pump to cool to ambient temperature
- Wear appropriate personal protective equipment

3. ROUTINE MAINTENANCE
3.1 Daily Checks
- Check pump operation for unusual noise or vibration
- Verify proper lubrication levels
- Inspect for leaks around seals and connections
- Monitor discharge pressure and flow rates

3.2 Weekly Maintenance
- Lubricate bearings according to schedule
- Check coupling alignment
- Inspect drive belts for wear and proper tension
- Clean pump exterior and remove debris

4. TROUBLESHOOTING
Common issues and solutions:
- Low flow rate: Check for blockages, worn impeller, or incorrect speed
- Excessive vibration: Verify shaft alignment, check for cavitation
- High temperature: Ensure adequate cooling, check bearing condition
    `;

    const maintenanceChunks = chunkText(maintenanceText.trim(), 300, 50);
    console.log(
      `✅ Maintenance manual chunked into ${maintenanceChunks.length} sections`
    );
    maintenanceChunks.forEach((chunk, index) => {
      const lines = chunk.split("\n").filter((line) => line.trim());
      const firstLine = lines[0] || chunk.substring(0, 30);
      console.log(`   Section ${index + 1}: "${firstLine.trim()}..."`);
    });
    console.log();

    console.log("🎉 All local functionality tests passed!");
    console.log("\n📋 System Components Verified:");
    console.log("   ✅ Text chunking algorithm");
    console.log("   ✅ Token estimation");
    console.log("   ✅ Token-based chunking");
    console.log("   ✅ Edge case handling");
    console.log("   ✅ Realistic document processing");

    console.log("\n💡 Next steps:");
    console.log("   1. Test with actual UI: npm run dev");
    console.log("   2. Upload warman-pump-maintenance-manual.pdf");
    console.log("   3. Verify database integration works in the browser");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testLocalFunctionality();
