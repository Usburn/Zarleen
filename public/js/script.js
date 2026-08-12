const element = document.getElementById("mobileHeader");
const sideBar = document.getElementById("sideBar");
const elementClose = document.getElementById("close");

element.addEventListener("click", () => {
  sideBar.classList.add("open");
});

elementClose.addEventListener("click", () => {
  sideBar.classList.remove("open");
});





const element_modify = document.querySelectorAll(".paragraph-hidden");

document.getElementById("modification").addEventListener("click", () => {

  console.log("I got clicked");

  const button = document.getElementById("modification");
  const text = button.innerHTML.trim();

  if (text === "Modifier ce post") {

    element_modify.forEach(el => {
      el.classList.remove("hidden");
    });

    button.innerHTML = "Annuler modification";

  } else {

    element_modify.forEach(el => {
      el.classList.add("hidden");
    });

    button.innerHTML = "Modifier ce post";
  }
});