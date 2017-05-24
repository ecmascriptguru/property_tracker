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

	const fieldCaptions = {
		"price" : "Price",
		"title" : "Title"
	}

	const renderData = ($change, $full, $chart, histories) => {
		let $fullLogTable = $("<table/>").addClass("ppy-ext-full-log-table"),
			$fullLogTBody = $("<tbody/>");

		$fullLogTBody.appendTo($fullLogTable);
		$full.append($fullLogTable);

		for (let i = histories.length - 1; i > 1; i--) {
			let prev = histories[i - 1],
				changedFiels = [],
				ignoreFieldsList = ["id", "created_at", "created_by", "updated_at", "updated_by", "agent"],
				$changes = $("<ul/>"),
				$fullLogRecord = $("<tr/>").addClass("found_by_myself").append(
					$("<td/>").text(histories[i].created_at)
				),
				$fullLogRecordChangeContentField = $("<td/>").addClass("change-content"),
				$fullLogUl = $("<ul/>");
			$fullLogTBody.append($fullLogRecord);
			$fullLogUl.appendTo($fullLogRecordChangeContentField);
			$fullLogRecordChangeContentField.appendTo($fullLogRecord);

			for (let p in histories[i]) {
				if (ignoreFieldsList.indexOf(p) > -1) {
					continue;
				}

				if (histories[i][p] != prev[p]) {
					changedFiels.push(p);
					$changes.append(
						$("<li/>").append(
							$("<span/>").addClass("change-text").text(fieldCaptions[p] + " changed from " + prev[p] + " to " + histories[i][p]),
							$("<span/>").addClass("change-founder").attr({
								title: "user00" + histories[i].created_by
							}).append($("<img/>").addClass("change-user-icon").attr({
								src: chrome.extension.getURL("assets/images/user_icon.jpg")
							}))
						)
					);

					$fullLogUl.append(
						$("<li/>").append(
							$("<span/>").text(fieldCaptions[p] + " changed: "),
							$("<span/>").addClass("prev-value").text(prev[p]),
							$("<span/>").addClass("cur-value").text(histories[i][p]),
							$("<img/>").addClass("change-user-icon").attr({
								title: "user00" + histories[i].created_by,
								src: chrome.extension.getURL("assets/images/user_icon.jpg")
							})
						)
					);
				}
			}
			$change.append(
				$("<div/>").addClass("row").append(
					$("<div/>").addClass("change-date").text(histories[i].created_at),
					$("<div/>").addClass("change-info").append($changes)
				)
			);
		}

		let lastIndex = histories.length - 1;
		$change.append(
			$("<div/>").addClass("row").append(
				$("<div/>").addClass("change-date").text(histories[lastIndex].created_at),
				$("<div/>").addClass("change-info").append(
					$("<ul/>").append(
						$("<li/>").append(
							$("<span/>").text("Initial Entry found."),
							$("<img/>").addClass("change-user-icon").attr({
								title: "user00" + histories[lastIndex].created_by,
								src: chrome.extension.getURL("assets/images/user_icon.jpg")
							})
						)
					)
				)
			)
		);

		$fullLogTBody.append(
			$("<tr/>").append(
				$("<td/>").addClass("change-time").text(histories[lastIndex].created_at),
				$("<td/>").addClass("change-content").append(
					$("<ul/>").append(
						$("<li/>").append(
							$("<span/>").text("Title found : " + histories[lastIndex].title),
							$("<img/>").addClass("change-user-icon").attr({
								title: "user00" + histories[lastIndex].created_by,
								src: chrome.extension.getURL("assets/images/user_icon.jpg")
							})
						)
					)
				)
			)
		);
	}

	const renderToMoveRight = (histories) => {
		let $detailTabBlock = $("div#detailsTabs").parents(".row.one-col"),
			$row = $("<div/>").addClass("row one-col"),
			$cell = $("<div/>").addClass("cell"),
			$module = $("<div/>").addClass("module"),
			$dataBlock = $("<div/>").attr("id", "ppy-trk-ext-block").addClass("tabbed-content"),
			$navigator = $("<ul/>").addClass("clearfix tabbed-content-nav print-hidden").append(
				$("<li/>").addClass("tabbed-content-nav-item active")
					.attr({
						"data-target": "changes-only"
					}).append($("<a/>").text("Changes")),
				$("<li/>").addClass("tabbed-content-nav-item")
					.attr({
						"data-target": "full-history"
					}).append($("<a/>").text("Full Log")),
				$("<li/>").addClass("tabbed-content-nav-item")
					.attr({
						"data-target": "chart-view"
					}).append($("<a/>").text("Chart View"))
			),
			$tabsContainer = $("<div/>").addClass("clearfix tabs"),
			$changesTab = $("<div/>").addClass("tabbed-content-tab clearfix active").attr({id: "changes-only"}),
			$fullLogTab = $("<div/>").addClass("tabbed-content-tab clearfix").attr({id: "full-history"}).text("Full history view"),
			$chartTab = $("<div/>").addClass("tabbed-content-tab clearfix").attr({id: "chart-view"}).text("Charts view");

		$dataBlock.append(
			$navigator,
			$tabsContainer.append($changesTab, $fullLogTab, $chartTab)
		);
		$row.append($cell.append($module.append($dataBlock)));
		$row.insertBefore($detailTabBlock);

		$("#ppy-trk-ext-block ul li.tabbed-content-nav-item").click((event) => {
			$("#ppy-trk-ext-block ul li.tabbed-content-nav-item.active").removeClass("active");
			$("#ppy-trk-ext-block div.tabbed-content-tab.active").removeClass("active");
			$(event.target).parent().addClass("active");
			$("#ppy-trk-ext-block #" + $(event.target).parent().attr("data-target")).addClass("active");
		});

		renderData($changesTab, $fullLogTab, $chartTab, histories);
	}

	const renderHistoryBlock = (hostname, histories) => {
		const renderFunctions = {
			"rightmove.co.uk": renderToMoveRight
		};

		renderFunctions[hostname](histories);
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
				renderHistoryBlock(params.host, response.histories);
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
			renderHistoryBlock(params.host, histories);
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

		chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
			switch(request.from) {
				case "background":
					if (request.action == "feed_histories") {
						let histories = request.data;
						renderHistoryBlock(hostname, histories);
					}
					break;

				default:
					console.log("Unknown message detected.");
					break;
			}
		});   
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