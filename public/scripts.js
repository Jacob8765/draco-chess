handleMessage = (data, user) => {
  if (data.to == user) {
    if (document.getElementById("messages").getAttribute("class").split(" ").indexOf("d-none") !== -1) {
      $("#messages").removeClass("d-none");
    }

    if (document.title[0] !== "(") {
      document.title = "(0) " + document.title;
    }
    document.getElementById("messages").innerHTML = Number(document.getElementById("messages").innerHTML) + 1;
    document.title = document.title.replace(document.title[1], Number(document.title[1]) + 1);
  }
}