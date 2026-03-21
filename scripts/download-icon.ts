import fs from "fs";
import https from "https";

async function downloadIcon() {
  const url = "https://picsum.photos/seed/orange-security-shield/1024/1024";
  const path = "public/icon.png";

  const file = fs.createWriteStream(path);
  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log("Icon downloaded successfully.");
    });
  }).on('error', (err) => {
    fs.unlink(path, () => {});
    console.error("Error downloading icon:", err.message);
  });
}

downloadIcon();
