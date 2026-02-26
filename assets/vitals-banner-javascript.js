// Optimized popup function
function showCustomPopup(message, options = {}) {
  document.getElementById("custom-popup-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "custom-popup-overlay";
  overlay.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:10000;font-family:Arial,sans-serif">
            <div style="background:white;border:2px solid black;border-radius:8px;padding:30px;max-width:400px;width:90%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:popupFadeIn 0.3s ease-out">
                <p style="color:black;font-size:16px;margin:0 0 20px 0;line-height:1.4">${message}</p>
                <div id="popup-buttons" style="display:flex;justify-content:center;gap:15px;flex-wrap:wrap"></div>
            </div>
        </div>
    `;

  const buttonContainer = overlay.querySelector("#popup-buttons");

  if (options.showMedicalProfessionalButtons) {
    ["Yes", "No"].forEach((text) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.style.cssText = `background:${
        text === "Yes" ? "black" : "white"
      };color:${text === "Yes" ? "white" : "black"};border:${
        text === "Yes" ? "none" : "2px solid black"
      };padding:10px 25px;font-size:16px;border-radius:4px;cursor:pointer;transition:all 0.2s ease;min-width:80px`;

      btn.onmouseenter = () =>
        (btn.style.cssText +=
          text === "Yes"
            ? "background-color:#333"
            : "background-color:black;color:white");
      btn.onmouseleave = () =>
        (btn.style.cssText = btn.style.cssText.replace(
          text === "Yes"
            ? "background-color:#333"
            : "background-color:black;color:white",
          ""
        ));

      btn.onclick = () => {
        overlay.remove();
        options.onMedicalProfessionalSelected?.(text.toLowerCase());
      };
      buttonContainer.appendChild(btn);
    });
    setTimeout(() => buttonContainer.firstChild.focus(), 100);
  } else {
    const okBtn = document.createElement("button");
    okBtn.textContent = "OK";
    okBtn.style.cssText =
      "background:black;color:white;border:none;padding:10px 30px;font-size:16px;border-radius:4px;cursor:pointer;transition:background-color 0.2s ease";
    okBtn.onmouseenter = () => (okBtn.style.backgroundColor = "#333");
    okBtn.onmouseleave = () => (okBtn.style.backgroundColor = "black");
    okBtn.onclick = () => overlay.remove();
    buttonContainer.appendChild(okBtn);

    overlay.onclick = (e) => e.target === overlay && overlay.remove();
    document.onkeydown = (e) => e.key === "Escape" && overlay.remove();
    setTimeout(() => okBtn.focus(), 100);
  }

  if (!document.querySelector("#popup-animation-style")) {
    const style = document.createElement("style");
    style.id = "popup-animation-style";
    style.textContent =
      "@keyframes popupFadeIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}";
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);
}

// Form configuration
const FORM_CONFIG = {
  banner: {
    emailId: "vitals-text",
    radioName: "option",
    radioPrefix: "",
    pdfSelector: "#vitals-banner-pdf-url",
  },
  floating: {
    emailId: "floating-bar-input",
    radioName: "floating-option",
    radioPrefix: "floating-",
    pdfSelector: "#vitals-floating-pdf-url",
  },
};

// Initialize forms
document.addEventListener("DOMContentLoaded", () => {
  ["vitals-banner-form", "floating-bar-form"].forEach((formId, index) => {
    const form = document.getElementById(formId);
    const formType = index === 0 ? "banner" : "floating";
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      handleFormSubmission(formType);
    });
  });
});

// Optimized form submission handler
function handleFormSubmission(formType) {
  const config = FORM_CONFIG[formType];
  const userEmail = document.getElementById(config.emailId).value;
  const medicalRadio = document.querySelector(
    `input[name="${config.radioName}"]:checked`
  );
  const isMedicalProfessional =
    medicalRadio?.id.replace(config.radioPrefix, "") || null;
  const pdfUrl = document.querySelector(config.pdfSelector)?.dataset.pdf;
  if (!pdfUrl) return showCustomPopup("PDF file is missing.");

  // Validate email
  if (!userEmail?.trim())
    return showCustomPopup("Please enter your email address");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail))
    return showCustomPopup("Please enter a valid email address");

  // Handle medical professional selection
  if (!medicalRadio) {
    return showCustomPopup("Are you a medical professional?", {
      showMedicalProfessionalButtons: true,
      onMedicalProfessionalSelected: (selection) => {
        document.getElementById(config.radioPrefix + selection).checked = true;
        console.log(`${formType} form data:`, {
          email: userEmail,
          isMedicalProfessional: selection,
        });
        sendVitalsEvent(userEmail, selection, pdfUrl);
      },
    });
  }

  console.log(`${formType} form data:`, {
    email: userEmail,
    isMedicalProfessional,
  });
  sendVitalsEvent(userEmail, isMedicalProfessional, pdfUrl);
}

// Constants and optimized functions
// const PDF_URL = 'https://cdn.shopify.com/s/files/1/0562/9247/5063/files/dummy.pdf?v=1751549273';
// const PDF_URL = document.querySelector(config.pdfSelector)?.dataset.pdf;

function sendVitalsEvent(userEmail, isMedicalProfessional, pdfUrl) {
  try {
    const clevertap = window.parent.clevertap;
    if (!clevertap) return console.error("CleverTap not found");

    const eventData = {
      "Email Id": userEmail,
      Action: "Download Report Request",
    };
    const userProfileData = { Email: userEmail };

    if (isMedicalProfessional !== null) {
      const isYes = isMedicalProfessional === "yes";
      eventData["Is Medical Professional"] = isYes ? "Yes" : "No";
      userProfileData["Medical Professional"] = isYes;
    }

    clevertap.event.push("Vitals Form Submission", eventData);
    clevertap.onUserLogin.push({ Site: userProfileData });
    console.log("CleverTap data sent successfully");

    downloadPDF(pdfUrl);
    window.dataLayer = window.dataLayer || [];
    dataLayer.push({
      event: 'Report_Downloaded'
    })
  } catch (error) {
    console.error("CleverTap error:", error);
  }
}

function downloadPDF(pdfUrl) {
  window.open(pdfUrl, "_blank");

  fetch(pdfUrl)
    .then((res) => (res.ok ? res.blob() : Promise.reject("Network error")))
    .then((blob) => {
      const link = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: "vitals-report.pdf",
        style: "display:none",
      });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      console.log("PDF download completed");
    })
    .catch((err) => console.error("PDF download error:", err));
}
