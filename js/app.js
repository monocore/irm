var requestWrapper = function(opts) {
    return new function() {
        me = this;
        me.opts = opts;
        me.success = me.loading = me.failed = false;
        me.errorStatus = me.errorBody = '';
        me.data = null;
        me.opts.background = true;
        me.opts.extract = function(xhr) {
            if (xhr.status >= 300) { // error!
                me.failed = true;
                me.success = me.loading = false;
                me.errorStatus = xhr.status;
                me.errorBody = xhr.responseText;
                m.redraw();
            }
            return xhr.responseText;
        }

        me = me;
        me.loading = true;
        me.success = me.failed = false;
        m.request(me.opts)
            .then(function(mydata) { // success!
                me.success = true;
                me.failed = me.loading = false;
                me.data = mydata;
                m.redraw();
            });
    }
}

var Header = {
    view: function(controller) {
        return m();
    }
}

var Header = {
    controller: function(data) {
        return {
            clickHandler: data.clickHandler,
            link: data.link,
            title: data.title
        }
    },
    view: function(ctrl) {
        return (m("a", {
            onclick: function() {
                ctrl.clickHandler();
            }
        }, ctrl.link));
    }
}

var App = {
    service: requestWrapper({ method: "GET", url: "json/data.json" }),
    view: function() {
        return [
            drawPage(App.service.data),
            this.service.failed ? [m("h4", "Error loading data: "), m("p", "Error status: " + this.service.errorStatus)] : ''
        ];

        function drawPage(data) {
            if (!App.service.success) {
                return;
            }
            return [
                m("header",
                    m("span", { class: "logo" }),
                    m("h1", { id: "title" }, data.title)
                ),
                m("div", { id: "tree" }, drawNodes(data.tree, false))
            ]
        }

        function drawNodes(children, nested) {
            if (nested) {
                App.nestLevel++;
            }
            if (children) {
                var hidden = nested ? "hidden" : "";
                return m("ol", { class: "level " + hidden },
                    children.map(function(item) {
                        if (item.children) {
                            return m("li",
                                m("a", {
                                    class: "big-a expander status-" + item.status,
                                    onclick: function() {
                                        //hide sibling li's only on level 1
                                        if (!nested) {
                                            toggleSiblings(this.parentNode, this, item);
                                        }
                                        //show the adjacent list(ol)
                                        this.parentElement.classList.toggle("expanded");
                                        this.nextElementSibling.classList.toggle("hidden");

                                    }
                                }, m("h2", m("i", { class: "fa fa-chevron-right" }), item.name)), drawNodes(item.children, true)
                            );
                        }
                        else {
                            if (item.nid) {//expect teaser etc
                                return drawEndNode(item);
                            } else {
                                return m("li", m("a", { class: "big-a bottom-level status-" + item.status }, m("h2", item.name)));
                            }
                        }
                    })
                );
            }
        }

        function drawEndNode(item) {
            return m("li", { class: "bottom-level" },
                m("a[href='javascript:;']", {
                    class: "detail expander", onclick: function() {
                        this.parentElement.classList.toggle("expanded");
                        this.nextElementSibling.classList.toggle("hidden");
                    }
                },
                    m("div", { class: "row" },
                        m("div", { class: "col1" },
                            m("p", { class: "detail-title" }, m("i", { class: "fa fa-chevron-right" }), item.name)),
                        m("div", { class: "col2" },
                            m("span", { class: "status-detail " + item.status }))
                    )
                ),
                m("div", { class: "hidable hidden" },
                    m("div", { class: "row" },
                        m("div", { class: "col1" }, m("p", { class: "teaser" }, item.teaser),
                            drawCharts(item),
                            function() {
                                if (item.details === true) {
                                    return [
                                        m("button", {
                                            onclick: function() {
                                                showNode(this.nextElementSibling, item.nid);
                                            }
                                        }, "Details"),
                                        m("div", { class: "popup-node hidden" },
                                            m("i", {
                                                class: "fa fa-times", onclick: function() {
                                                    this.parentNode.classList.toggle("hidden");
                                                }
                                            }),
                                            m("div", { class: "content" })
                                        )
                                    ]
                                }
                            } ()
                        ),
                        m("div", { class: "col2" }, drawHistory(item))
                    )
                )
            );
        }

        function drawHistory(item) {
            if (!App.service.success) {
                return;
            }
            return m("ol", item.statushistory.map(function(row) {
                return m("li", { class: "status-detail-mini " + row.status }, row.period);
            }));
        }

        function drawCharts(item) {
            var returnM = [];
            //return m("div", {id: item[0].selector, config: drawChart(item[0]) })
            if (item.hasOwnProperty("charts")) {
                item.charts.forEach(function(chart) {
                    console.log(chart);
                    //returnM.push(m(chart.selector, { config: drawChart(chart) }));
                    return m(chart.selector, { config: drawChart(chart) })
                });
            }
            return returnM;
        }

        function drawChart(chart) {
            return function(elem) {
                m.startComputation();
                var chart = Chartist.Line(chart.selector, chart.data, chart.options);
                m.endComputation();
            }

        }
    }
}

function toggleSiblings(el, current, item) {
    //If node only contains endnodes dont compress siblings
    if (current.nextSibling.children[0].classList.contains("bottom-level")) {
        return;
    }
    var siblings = el.parentNode.children;
    for (var i = 0; i < siblings.length; i++) {
        siblings[i].classList.toggle("hidden");
    }
    el.classList.toggle("hidden");
    el.classList.toggle("hierarchy");
    //move A from current li to header and back
    el.firstElementChild.classList.toggle("istitle");
}

function showNode(element, nid) {
    $('.content', element).load("json/node-" + nid.toString() + ".html", function() {
        element.classList.toggle("hidden");
        height = $(window).height() - 70;   // returns height of browser viewport
        width = $(window).width() - 70;
        $(element).css({ "width": width, "min-height": height, "height": "auto" });
    });
}
//See https://lhorie.github.io/mithril/integration.html
var mChartist = {
    //Returns a chart
    view: function(ctrl, attrs) {
        //Create a chartist chart
        return m("div", {config: mChartist.config(attrs) });
    },
    /**
    Chartist config factory. The params in this doc refer to properties of the `ctrl` argument
    @param {Object} data - the data with which to populate the chart
    @param {Object} options - the options object with the chart configurations    
    */    
    config: function(ctrl) {
        return function(element, isInitialized) {
            if (typeof Chartist !== 'undefined') {
                if (!isInitialized) {
                    m.startComputation();
                    Chartist.Line(element, ctrl.data, ctrl.options);
                    m.endComputation();
                }                
            } else {
                console.warn('ERROR: You need Chartist in the page');
            }
        };
    }
};

var app = m.module(document.getElementById("main-container"), App);