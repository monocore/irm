/**
 * Service wrapper
 */
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

/**
 * Application namespace for the mithril view
 * Not using a controller now only using the output of the data service
 */
var App = {
    service: requestWrapper({ method: "GET", url: "/bestuursrapportage/json/1/2016/Q1" }),
        
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

        /**
         * Recursive function to iterate the data tree.
         */
        function drawNodes(children, nested) {            
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
        /**
         * Draw a detail node with texts and a ajax loader for html fragments from the drupal body field
         */
        function drawEndNode(item) {            
            return m("li", { class: "bottom-level" },
                m("a[href='javascript:;']", {
                    class: "detail expander", onclick: function() {
                        this.parentElement.classList.toggle("expanded");
                        this.nextElementSibling.classList.toggle("hidden");
                    }
                },
                    m("i", { class: "fa fa-chevron-right" }),
                    m("div", { class: "row" },
                        m("div", { class: "col1" },
                            m("p", { class: "detail-title" }, item.name)),
                        m("div", { class: "col2" },
                            m("span", { class: "status-detail " + item.status }))
                    )
                ),
                m("div", { class: "hidable hidden" },
                    m("div", { class: "row" },
                        m("div", { class: "col1" }, m("p", { class: "teaser" }, item.teaser),                                                        
                            function() {                                
                                if (item.details === true) {
                                    return [
                                        m("button", {
                                            onclick: function() {
                                                showNode(this.nextElementSibling, item.nid, item);
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
                                } else {
                                    //Only draw chart if details is false                                    
                                    return m("div", {id : "chart-" + item.nid}, drawCharts(item));
                                }
                            } ()
                        ),
                        m("div", { class: "col2" }, drawHistory(item))
                    )
                )
            );
        }
        /**
         * Draw the small history navigator with statuses which is a static list for now
         */
        function drawHistory(item) {
            if (!App.service.success) {
                return;
            }
            if (item.hasOwnProperty("statushistory")) {
                return m("ol", item.statushistory.map(function(row) {                
                    return m("li", { class: "status-detail-mini " + row.status }, m("a", { href: "#", onclick: function(){
                        //Call shownode without item so it will retrieve it's own teaser, title, chart, status etc.
                        showNode(this.nextElementSibling, row.nid);
                    }}, row.period),
                        m("div", { class: "popup-node hidden" },
                            m("i", {
                                class: "fa fa-times", onclick: function() {
                                    this.parentNode.classList.toggle("hidden");
                                }
                            }),
                            m("div", { class: "content" })
                        )
                    );
                }));
            }
        }
        /**
         * Render the highcharts charts using the custom created mChart component
         * ToDo allow multiple charts
         */
        function drawCharts(item){            
            var charts = [];
            if (item.hasOwnProperty("charts")) {                
                /*item.charts.forEach(function(chart){
                    charts.push(m.component(mChart, {data: chart}));
                });*/
                return m.component(mChart, {data: item.charts[0]});
                //return charts;
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

/**
 *
 * @param element target for node content
 * @param nid
 * @param item Object, optional
 */
function showNode(element, nid, item) {
    var chart_id, options;
    $('.content', element).load("/bestuursrapportage/content/" + nid.toString(), function(response, status, xhr) {
        if (status == 'error') {
            console.log("Error loading node");
        } else {
            //If item not available, load from service
            if (item === undefined) {
                $.getJSON("/betuursrapportage/json/node/" + nid, function(data){
                    item = data;
                    renderNode(element, item);
                });
            } else {
                renderNode(element, item);
            }
        }
    });
}

function renderNode(element, item){
    height = $(window).height() - 10;   // returns height of browser viewport
    width = $(window).width() - 10;
    $(element).css({ "width": width, "min-height": height, "height": "auto" });
    element.classList.toggle("hidden");
    //Insert chart if available
    if (item.hasOwnProperty("charts")) {
        //insert after h1
        chart_id = "chart-" + nid;
        var hc = document.createElement("div");
        hc.setAttribute("id", chart_id);
        $(hc).insertAfter(".content h1");
        //Apply the highchart
        Highcharts.chart(chart_id, item.charts[0].options);
    }
    //Insert teaser
    if (item.hasOwnProperty("teaser")) {
        $('<span class="teaser>').add("<p>" + item.teaser + "</p>").insertAfter(".content h1");
    }
}
/**
 * Mithril component "wrapper" for the highcharts component
 * See https://lhorie.github.io/mithril/integration.html 
 */

var mChart = {
    //Returns a chart
    view: function(ctrl, attrs) {
        //Create a chartist chart        
        return m("div", {id: attrs.data.selector, config: mChart.config(attrs) });
    },
    /**
    Highcharts config factory. The params in this doc refer to properties of the `ctrl` argument
    @param {Object} data - the data with which to populate the chart
    @param {Object} options - the options object with the chart configurations    
    */    
    config: function(ctrl) {
        return function(element, isInitialized) {
            if (typeof Highcharts !== 'undefined') {
                if (!isInitialized) {
                    m.startComputation();                    
                    var chart = Highcharts.chart(element, ctrl.data.options);
                    m.endComputation();

                }                
            } else {
                console.warn('ERROR: You need highcharts in the page');
            }
        };
    }
};

var app = m.module(document.getElementById("main-container"), App);