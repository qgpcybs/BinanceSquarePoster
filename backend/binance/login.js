async function login(browser, page, username, password) {
  try {
    await page.setRequestInterception(false);
    await page.goto("https://accounts.binance.com/zh-CN/login");
    await page.waitForSelector("#googleLoginBtn", { visible: true });
    console.log("googleLoginBtn okk");
    await page.click("#googleLoginBtn > button", { force: true });
    console.log("googleLoginBtn clicked");
    const popup = await new Promise((resolve) => page.on("popup", resolve));

    // Input gmail
    await popup.waitForSelector('input[type="email"]', { visible: true });
    await popup.type('input[type="email"]', username);
    await popup.click("#identifierNext"); // Njthtb

    // Input password
    await popup.waitForSelector('input[type="password"]', { visible: true });
    await popup.type('input[type="password"]', password);
    await popup.click("#passwordNext");

    // Wait popup close
    const popupClosePromise = new Promise((resolve) => {
      browser.on("targetdestroyed", (target) => {
        if (target === popup.target()) resolve();
      });
    });

    // 2FA
    const verificationCodePromise = new Promise((resolve) => {
      // Listen <samp>
      popup.evaluate(() => {
        const observer = new MutationObserver((mutationsList) => {
          for (const mutation of mutationsList) {
            if (mutation.type === "characterData") {
              const sampElement = document.querySelector("samp");
              if (sampElement) resolve(sampElement.innerText);
            }
          }
        });

        const sampElement = document.querySelector("samp");
        if (sampElement)
          observer.observe(sampElement, {
            characterData: true,
          });
      });
    });

    // Wait verification code or popup closed
    let verificationCode;
    try {
      verificationCode = await Promise.race([
        verificationCodePromise,
        popupClosePromise.then(() => null),
      ]);
    } catch (e) {
      console.log("Google 2FA listen error:", e);
    }

    if (verificationCode) {
      console.log(
        '2FA number is "' + verificationCode + '", please check on mobile.'
      );
    } else {
      console.log("No more 2FA");
    }

    await popupClosePromise;

    // while (true) {
    //   try {
    //     await popup.waitForSelector("samp");
    //     const verificationCode = await popup.evaluate(() => {
    //       const sampElement = document.querySelector("samp");
    //       return sampElement ? sampElement.innerText : null;
    //     });

    //     if (verificationCode) {
    //       console.log(
    //         '2FA number is "',
    //         verificationCode,
    //         '", please check on mobile.'
    //       );

    //       // Wait for user check
    //       const timeoutPromise = new Promise((_, reject) => {
    //         setTimeout(() => {
    //           reject(new Error("2FA timeout."));
    //         }, 5 * 60 * 1000);
    //       });

    //       // Listen popup close
    //       const popupClosePromise = new Promise((resolve) => {
    //         browser.on("targetdestroyed", (target) => {
    //           if (target === popup.target()) {
    //             resolve();
    //           }
    //         });
    //       });

    //       await Promise.race([popupClosePromise, timeoutPromise]);
    //       console.log("Popup closed");
    //     } else {
    //       console.log("Unknown 2FA");
    //     }
    //   } catch (e) {
    //     console.log("No 2FA");
    //   }
    // }

    // await page.waitForNavigation({ waitUntil: "networkidle2" });

    console.log("Login Successful!");
  } catch (e) {
    console.error("Login Failed:", e);
    throw e;
  }
}

module.exports = login;
