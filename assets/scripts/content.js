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
		_itemImgUrl = null,

		getProductInfo = function() {
			return {
				number: _itemNum,
				title: _itemTitle,
				price: _itemPrice,
				count: _bidCount,
				condition: _itemCond
			}
		},

		renderHistoryBlock = function(histories) {
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
		},

		checkHistory = function(histories) {
			if (histories.length === 0) {
				return false;
			} else {
				let lastInfo = histories[histories.length - 1];

                return (
                    // lastInfo.description == _itemDescription &&
                    lastInfo.title == _itemTitle &&
                    lastInfo.price == _itemPrice &&
                    lastInfo.bidders == _bidCount &&
					lastInfo.description == _itemDescription
                );
			}
		},

        saveHistories = function(histories, imgUrl, callback) {
            if (histories.length > 0) {
                chrome.runtime.sendMessage({
                    from: "ebay",
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
        },

		getHistory = function(histories, imgUrl, params) {
			if (checkHistory(histories)) {
                renderHistoryBlock(histories);
            } else {
                restAPI.getHistory(params, function(response) {
                    if (response.status) {
                        console.log(response.histories);
                        saveHistories(response.histories, imgUrl);
                        renderHistoryBlock(response.histories);
                    } else {
                        chrome.runtime.sendMessage({
                            from: "ebay",
                            action: "expired"
                        });
                    }
                });
            }   
		},

		init = function(num, hostname) {
			_itemNum = num;
			_hostname = hostname;

			if ($("#itemTitle").length > 0 && 
				$("#prcIsum_bidPrice").length > 0 &&
				$("#vi-VR-bid-lnk span#qty-test").length > 0 &&
				$("#vi-itm-cond").length > 0) {
				
				_itemTitle = $("#itemTitle").text().trim();
				_itemPrice = $("#prcIsum_bidPrice").text().trim();
				_bidCount = $("#vi-VR-bid-lnk span#qty-test").text().trim();
				_itemCond = $("#vi-itm-cond").text().trim();
				_itemImgUrl = (document.getElementById("icImg") || {}).src;

				let iframe = document.getElementById("desc_ifr");

				chrome.runtime.sendMessage({
					from: "ebay",
					action: "check_auth",
					hostname: _hostname,
					number: _itemNum,
					descUrl: iframe.src
				}, function(response) {
					if (response.token) {
						_token = response.token;

						if (_token) {
							chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
								_itemDescription = request.desc;
								getHistory(
									response.histories,
									_itemImgUrl,
									{
										token: _token,
										ref: _itemNum,
										host: _hostname,
										title: _itemTitle,
										price: _itemPrice,
										bidders: _bidCount,
										description: _itemDescription,
										condition: _itemCond
									}
								);
							});
						}
					}
				});
			}	   
		};

	return {
		init: init,
		info: getProductInfo
	};
})();

(function(window, jQuery) {
	let itmPathMatch = window.location.pathname.match(/\/itm\//g),
		itemNumPathMatch = window.location.pathname.match(/\/(\d+){5,12}/g);

	if (itemNumPathMatch.length ===1 && itemNumPathMatch.length == 1) {
		let itemNum = itemNumPathMatch[0].substr(1);
		ContentScript.init(itemNum, window.location.hostname.substr("www.".length));
	}
})(window, $);