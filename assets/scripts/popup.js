'use strict';

let Popup = (function() {
    let _steps = [
            "step_1",
            "step_2",
            "step_3",
            "step_4",
            "login"
        ],

        _itemsTable = null,

        _curStep = JSON.parse(localStorage._curStep || "null") || "step_1",

        drawTable = function() {
            let data = JSON.parse(localStorage._histories || "{}"),
                index = 1;

            for (let domain in data) {
                let items = data[domain];
                for (let itemNum in items) {
                    let imgUrl = items[itemNum].img,
                        logs = items[itemNum].histories,
                        item = logs[logs.length - 1];

                    _itemsTable.row.add([
                        index,
                        "<img src='" + imgUrl + "' class='product-img' />",
                        item.price,
                        item.bidders,
                        "<a class='btn btn-info' target='_blank' href='http://www." + domain + "/itm/" + itemNum + "'>Check Item</a>"
                    ]).draw();

                    index ++;
                }
            }
        },

        goTo = function(step) {
            _steps.forEach(function(val) {
                if (step == val) {
                    $("#" + val).show();
                    localStorage._curStep = JSON.stringify(step);
                } else {
                    $("#" + val).hide();
                }
            });

            if (step == "step_4") {
                drawTable();
            }
        },

        setToken = function(token, user) {
            localStorage._token = JSON.stringify(token || "");
            localStorage._user = JSON.stringify(user || {});
        },

        controlButtonHandler = function(event) {
            event.preventDefault();

            if (event.target.getAttribute('data-target')) {
                if (event.target.getAttribute('data-action') === "register") {
                    restAPI.register($("#username").val(), $("#email").val(), $("#password").val(), function(response) {
                        if (response.status) {
                            setToken(response.token, response.user);
                            goTo(event.target.getAttribute('data-target'));
                        }
                    });
                } else if (event.target.getAttribute('data-action') === "login") {
                    restAPI.login($("#login-email").val(), $("#login-password").val(), function(response) {
                        if (response.status) {
                            setToken(response.token, response.user);
                            goTo(event.target.getAttribute('data-target'));
                        }
                    });
                } else if (event.target.getAttribute('data-action') === "logout") {
                    localStorage._token = JSON.stringify(null);
                    goTo(event.target.getAttribute('data-target'));
                } else {
                    goTo(event.target.getAttribute('data-target'));
                }
            } else {
                if (event.target.getAttribute('data-action') === "done") {
                    console.log("Clicking done...");
                }
            }
        },

        init = function() {
            $("button.step-control-button").click(controlButtonHandler);
            _itemsTable = $("table#tbl-items").DataTable({
                "autoWidth": false
            });
            goTo(_curStep);
        };

    return {
        init: init
    };
})();

(function(window, jQuery) {
    Popup.init();
})(window, $);