'use strict';

let ContentScript = (function() {
	let _token = null,
		_itemNum = null,
		_itemTitle = null,
		_bidCount = null,
		_itemPrice = null,
		_itemCond = null,
        _itemDescription = null,
		_hostname = null,
		_itemImgUrl = null;

	const getProductInfo = function() {
		return {
			number: _itemNum,
			title: _itemTitle,
			price: _itemPrice,
			count: _bidCount,
			condition: _itemCond
		}
	};

	const renderHistoryBlock = function(histories) {
		if (histories.length == 1) {
			return false;
		}
		let $container = $("<div/>").attr({id: "ebay-auction-tracking-extension-container"}),
			$title = $("<h2/>").text("Changed detected!");

		$container.append($title);

		for (let i = histories.length - 2; i >= 0; i --) {
			let $block = $("<div/>").addClass({"id": "ebay-auction-extension-change-block"});

			$block.append(
				$("<h5/>").text(histories[i].updated_at),
				$("<h5/>").text("Title:  " + histories[i].title),
				$("<h5/>").text("Description:  " + histories[i].description),
				$("<h5/>").text("Bids:   " + histories[i].bidders),
				$("<h5/>").text("Price:  " + histories[i].price)
			);

			$container.append($block);

			if (i != 0) {
				$container.append($("<br/>"));
			}
		}

		$("#CenterPanelInternal").before($container);
	};

    const saveHistories = function(histories, imgUrl, callback) {
		if (histories.length > 0) {
			chrome.runtime.sendMessage({
				from: "cs",
				action: "save_histories",
				hostname: _hostname,
				number: _itemNum,
				imageUrl: imgUrl,
				histories: histories
			}, function(response) {
				if (typeof callback === "function") {
					callback(response);
				} else {
					console.log(response);
				}
			})
		}
	};

	const getHistory = function(params) {
		restAPI.getHistory(params, function(response) {
			if (response.status) {
				console.log(response.histories);
				saveHistories(response.histories, imgUrl);
				renderHistoryBlock(response.histories);
			} else {
				chrome.runtime.sendMessage({
					from: "cs",
					action: "expired"
				});
			}
		});
	};

	const isChanged = (prev, cur) => {
		for (let p in prev) {
			if (prev[p] != cur[p]) {
				return true;
			}
		}
		return false;
	};

	const viewHistory = (cur, histories) => {
		if (histories.length == 0 || isChanged(histories[histories.length - 1], cur)) {
			//	Ajax call
			chrome.runtime.sendMessage({
				from: "cs",
				action: "get_remote_histories",
				data: cur
			});
		} else {
			renderHistoryBlock(histories);
		}
	}

	const checkRightMove = (host, num, histories) => {
		let title = (($(".property-header-bedroom-and-price div.left h1") || {}).text() || "").trim(),
			address  = (($(".property-header-bedroom-and-price div.left address") || {}).text() || "").trim(),
			price = (($("#propertyHeaderPrice") || {}).text() || "").trim(),
			agent = (($("#aboutBranchLink strong") || {}).text() || "").trim(),
			agent_address = (($("#aboutBranchLink strong") || {}.siblings() || {}).text() || "").trim(),
			agent_phone = (($("#requestdetails strong").eq(0)).text() || "").trim(),
			features = $("div.key-features li"),
			description = ((features.parents(".key-features").next()).text() || "").trim(),
			tempFeatures = [];

		for (let i = 0; i < features.length; i ++) {
			tempFeatures.push(features.eq(i).text().trim());
		}
		features = tempFeatures.join("\n");

		let info = {
			host,
			number: num,
			title,
			address,
			price,
			agent,
			agent_address,
			agent_phone,
			features,
			description
		};

		viewHistory(info, histories);
	};

	const checkZoopla = (host, num, histories) => {
		let title = (($("#listing-details h2[itemprop='name']") || {}).text() || "").trim(),
			price = (($(".listing-details-price strong") || {}).text() || "").trim(),
			address = (($("div.listing-details-address h2[itemprop='streetAddress']") || {}).text() || "").trim(),
			agent = (($("#listings-agent strong[itemprop='name']") || {}).text() || "").trim(),
			agent_address = (($("#listings-agent span[itemprop='address']") || {}).text() || "").trim(),
			agent_phone = (($("#listings-agent a[itemprop='telephone']") || {}).text() || "").trim(),
			features = $("#tab-details #images").next().next().find("ul li") || [],
			description = (($("#tab-details div[itemprop='description']") || {}).text() || "").trim(),
			tempFeatures = [];

		for (let i = 0; i < features.length; i ++) {
			tempFeatures.push(features.eq(i).text().trim());
		}
		features = tempFeatures.join("\n");

		let info = {
			host,
			number: num,
			title,
			address,
			price,
			agent,
			agent_address,
			agent_phone,
			features,
			description
		};
		viewHistory(info, histories);
	};

	const checkOnTheMarket = (host, num, histories) => {
		let title = (($(".details-heading h1").eq(0) || {}).text() || "").trim(),
			price = (($(".details-heading .price .price-data").eq(0) || {}).text() || "").trim(),
			address = (($(".details-heading .price").eq(0).next().next() || {}).text() || "").trim(),
			agent = (($(".agent-name") || {}).text() || "").trim(),
			agent_address = (($(".agent-address") || {}).text() || "").trim(),
			agent_phone = (($(".agent-phone-link").eq(0) || {}).text() || "").trim(),
			features = $("ul.property-features li") || [],
			description = (($(".description").eq(1) || {}).text() || "").trim(),
			tempFeatures = [];

		for (let i = 0; i < features.length; i ++) {
			tempFeatures.push(features.eq(i).text().trim());
		}
		features = tempFeatures.join("\n");

		let info = {
			host,
			number: num,
			title,
			address,
			price,
			agent,
			agent_address,
			agent_phone,
			features,
			description
		};
		viewHistory(info, histories);
	};

	const checkPages = {
		"rightmove.co.uk": checkRightMove,
		"zoopla.co.uk": checkZoopla,
		"onthemarket.com": checkOnTheMarket
	};

	const init = function(num, hostname, histories) {
		_itemNum = num;
		_hostname = hostname;

		checkPages[_hostname](hostname, _itemNum, histories);

		if (_token) {
			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
				switch(request.from) {
					case "background":
						if (request.action == "feed_historeis") {
							let histories = request.data;
							console.log(histories);
						}
						break;

					default:
						console.log("Unknown message detected.");
						break;
				}
			});
		}

		// if ($("#itemTitle").length > 0 && 
		// 	$("#prcIsum_bidPrice").length > 0 &&
		// 	$("#vi-VR-bid-lnk span#qty-test").length > 0 &&
		// 	$("#vi-itm-cond").length > 0) {
			
		// 	_itemTitle = $("#itemTitle").text().trim();
		// 	_itemPrice = $("#prcIsum_bidPrice").text().trim();
		// 	_bidCount = $("#vi-VR-bid-lnk span#qty-test").text().trim();
		// 	_itemCond = $("#vi-itm-cond").text().trim();
		// 	_itemImgUrl = (document.getElementById("icImg") || {}).src;

		// 	let iframe = document.getElementById("desc_ifr");

		// 	chrome.runtime.sendMessage({
		// 		from: "ebay",
		// 		action: "check_auth",
		// 		hostname: _hostname,
		// 		number: _itemNum,
		// 		descUrl: iframe.src
		// 	}, function(response) {
		// 		if (response.token) {
		// 			_token = response.token;

		// 			if (_token) {
		// 				chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		// 					_itemDescription = request.desc;
		// 					getHistory(
		// 						response.histories,
		// 						_itemImgUrl,
		// 						{
		// 							token: _token,
		// 							ref: _itemNum,
		// 							host: _hostname,
		// 							title: _itemTitle,
		// 							price: _itemPrice,
		// 							bidders: _bidCount,
		// 							description: _itemDescription,
		// 							condition: _itemCond
		// 						}
		// 					);
		// 				});
		// 			}
		// 		}
		// 	});
		// }	   
	};

	return {
		init: init,
		info: getProductInfo
	};
})();

(function(window, jQuery) {
	const domains = {
		"rightmove.co.uk": [/property-for-sale\/property\-(\d+){8,8}.html/g, /(\d+){8,8}/g], 
		"zoopla.co.uk": [/\/for-sale\/details\/(\d+){8,8}/g, /(\d+){8,8}/g],
		"onthemarket.com": [/\/details\/(\d+){7}/g, /(\d+){7,7}/g]
	};
	const isValidUrl = () => {
		let host = window.location.host.substr((window.location.host.indexOf("www.") == 0) ? "www.".length : 0),
			pat = domains[host];

		if (pat && typeof pat == "object") {
			let matches = window.location.pathname.match(pat[0]);

			if (matches && matches.length > 0) {
				let itemNums = window.location.pathname.match(pat[1]);
				return {
					host: host,
					num: itemNums[0]
				};
			} else {
				return false;
			}
		} else {
			return false;
		}
	};

	let isValid = isValidUrl();
	if (isValid && typeof isValid == "object") {
		chrome.runtime.sendMessage({
			from: "cs",
			action: "history",
			domain: isValid.host,
			number: isValid.num
		}, function(response) {
			ContentScript.init(isValid.num, isValid.host, response.histories);
		});
	}
})(window, $);