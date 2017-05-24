'use strict';

let Background = (function() {
	let _tabsInfo = {},
		checkAuth = function(callback) {
			let _token = JSON.parse(localStorage._token || "null");
			
			if (!_token) {
				chrome.tabs.query({url: chrome.extension.getURL("assets/html/login.html")}, function(tabs) {
					if (tabs.length > 0) {
						chrome.tabs.update(tabs[0].id, {active: true});
					} else {
						chrome.tabs.create({url: chrome.extension.getURL("assets/html/login.html")});
					}
				})
			} else {
				if (typeof callback === "function") {
					callback(_token);
				} else {
					return _token;
				}
			}
		},

		init = function() {
			chrome.runtime.onInstalled.addListener(function (details) {
				console.log('previousVersion', details.previousVersion);
				checkAuth();
			});

			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
				switch(request.from) {
					case "cs":
						if (request.action === "check_auth") {
							let hostname = request.hostname,
								itemNumber = request.number,
								histories = ((JSON.parse(localStorage._histories || "{}")[hostname] || "{}")[itemNumber] || {}).histories || [],
								descUrl = request.descUrl;

							chrome.tabs.create({url: descUrl, active: false}, function(tab) {
								_tabsInfo[tab.id.toString()] = sender.tab.id;
							});
							sendResponse({
								token: JSON.parse(localStorage._token || "null"),
								histories: histories
							});
						} else if (request.action == "expired") {
							localStorage._token = JSON.stringify(null);
							localStorage._curStep = JSON.stringify("login");
						} else if (request.action == "save_histories") {
							let hostname = request.hostname,
								itemNumber = request.number,
								imageUrl = request.imageUrl,
								histories = request.histories,
								savedHistories = JSON.parse(localStorage._histories || "{}");

							if (!savedHistories[hostname]) {
								savedHistories[hostname] = {};
							}

							savedHistories[hostname][itemNumber] = {
								img: imageUrl,
								histories: histories
							};

							localStorage._histories = JSON.stringify(savedHistories);
						} else if (request.action == "history") {
							let histories = (JSON.parse(localStorage._histories || "{}")[request.domain] || "{}")[request.number] || [];

							sendResponse({
								histories: histories
							});
						} else if (request.action == "get_remote_histories") {
							request.data.token = JSON.parse(localStorage._token || "null");
							restAPI.getHistory(request.data, (response) => {
								chrome.tabs.sendMessage(sender.tab.id, {
									from: "background",
									action: "feed_histories",
									data: response
								});
							});
						}
						break;

					case "login":
						if (request.action === "close_me") {
							chrome.tabs.remove(sender.tab.id);
						}
						break;

					default:
						console.log("Unknown message detected.");
						break;
				}
			});
		};

	return {
		init: init
	};
})();

(function(window, jQuery) {
	Background.init();
})(window, $);