const YTDlpWrap = require("yt-dlp-wrap").default;
const ytDlp = new YTDlpWrap("./yt-dlp.exe"); // Make sure the path is correct

async function getVideoSize(url) {
  try {
    const output = await ytDlp.execPromise([
      url,
      "--cookies",
      "./cookies.txt",
      "--print",
      "%(filesize,filesize_approx)d", // Get file size
      "-s", // Simulate, do not download
    ]);

    const fileSizeMB = parseInt(output.trim()) / (1024 * 1024); // Convert to MB
    // console.log(`Estimated Size: ${fileSizeMB.toFixed(2)} MB`);
    return fileSizeMB;
  } catch (error) {
    console.error("Failed to get video size:", error);
    return null;
  }
}

module.exports = getVideoSize;
