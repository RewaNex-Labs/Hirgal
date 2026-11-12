
document.addEventListener("DOMContentLoaded", () => {
    console.log("Hirgal is running successfully!");

    const languageBtn = document.getElementById("languageBtn");

    languageBtn.addEventListener("click", () => {
        const currentLanguage = languageBtn.textContent;
        languageBtn.textContent =
            currentLanguage === "SO" ? "EN" : "SO";
    });
});
