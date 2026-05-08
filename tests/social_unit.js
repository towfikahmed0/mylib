function calculateReadTime(text) {
    const wordCount = (text || "").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
}

function testReadTime() {
    console.log("Testing Read Time Calculation...");

    const cases = [
        { text: "One two three", expected: 1 },
        { text: "a ".repeat(201), expected: 2 },
        { text: "a ".repeat(401), expected: 3 },
        { text: "", expected: 1 }
    ];

    cases.forEach((c, i) => {
        const result = calculateReadTime(c.text);
        if (result === c.expected) {
            console.log("✅ Case " + (i+1) + " passed");
        } else {
            console.error("❌ Case " + (i+1) + " failed: expected " + c.expected + ", got " + result);
            process.exit(1);
        }
    });
}

function testSanitization() {
    console.log("\nTesting Sanitization (escapeHTML mock)...");

    function escapeHTML(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const input = "<script>alert('xss')</script>";
    const expected = "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;";
    const result = escapeHTML(input);

    if (result === expected) {
        console.log("✅ Sanitization passed");
    } else {
        console.error("❌ Sanitization failed: expected " + expected + ", got " + result);
        process.exit(1);
    }
}

testReadTime();
testSanitization();
console.log("\nAll unit tests passed!");
