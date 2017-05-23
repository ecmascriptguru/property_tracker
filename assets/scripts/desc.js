(function() {
    let desc = document.getElementById("ds_div").textContent.trim();
    chrome.runtime.sendMessage({
        from: "desc",
        desc: desc
    });
})();