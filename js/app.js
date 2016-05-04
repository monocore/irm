var config = {
    endpoint: "/bestuursrapportage/json/",
    currentVocabulary: "1", //SLA 
    currentYear : "2016",
    currentPeriod: "Q1",
    nodeURL : function(){
        return this.endpoint + "node/";
    },
    treeURL: function(){
        return this.endpoint + "tree/" + this.currentVocabulary + "/" + this.currentYear + "/" + this.currentPeriod
    }
}

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
    service: requestWrapper({ method: "GET", url: config.treeURL()}),
        
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
                            m("p", { class: "detail-title" }, item.name)
                        ),
                        m("div", { class: "col2" },
                            m("span", { class: "status-detail " + item.status }))
                    )
                ),
                m("div", { class: "hidable hidden" },
                    m("div", { class: "row" },
                        m("div", { class: "col1" }, m("p", { class: "detail-description" }, item.description), m("p", { class: "teaser" }, item.teaser),
                            function() {
                                if (item.hasOwnProperty("body") && item.body.length > 0) {
                                    return [                                        
                                        m("button", {                                           
                                            onclick: function() {
                                                if (this.nextElementSibling) {                                                                                                        
                                                    this.nextElementSibling.classList.toggle("hidden");
                                                } else {
                                                    showNode(this, item);    
                                                }
                                            }
                                        }, "Details")                                        
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
                        //Get history node
                        var el = this;
                        if (this.nextElementSibling) {
                            this.nextElementSibling.classList.toggle("hidden");
                        } else {
                            $.getJSON(config.nodeURL() + row.nid, function(data){
                                showNode(el, data);
                                //m.render(document.getElementById("chart-" + row.nid), m.component(mChart, {data: item}));
                            });
                        }
                        }}, row.period)
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
                return m.component(mChart, {data: item});                
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
 * @param item Object : node details
 * @param originalItem Object : node details
 */
function showNode(element, item) {
    //disable scrolling on the body
    $('body').css("overflow", "hidden");
    var chart_id, options, height, width, popup;
    $(element).after(popup);
    popup = document.createElement("div");
    popup.classList.add("popup");    
    $(element).after(popup);
    $popup = $(popup);
    $popup.html('<i class="fa fa-times"></i><div class="content"></div>');
    $popup.on("click", "i", function(){        
        this.parentElement.classList.toggle("hidden");
        $("body").css("overflow", "auto");
    });

    $("<h1>").appendTo(".content", popup);
    $(".content h1", popup).append(item.title);
    //Insert teaser
    if (item.hasOwnProperty("teaser")) {
        $('<span class="teaser">').appendTo(".content", popup);
        $('<p>').appendTo(".teaser", popup);
        $("span.teaser p", popup).append(item.teaser);
    }

    //popup.classList.toggle("hidden");
    //Insert chart if available
    if (item.hasOwnProperty("charts")) {
        //insert after h1
        chart_id = "chart-" + item.nid;
        var hc = document.createElement("div");
        hc.setAttribute("id", chart_id);
        $(hc).appendTo(".content", element);
        //Apply the highchart
        //$(chart_id).highcharts(item.charts[0].options);
        Highcharts.chart(chart_id, item.charts[0].options);
    }
    $('<div class="body">').appendTo(".content", $popup);
    $(".body", $popup).append(item.body);
}

/**
 * Mithril component "wrapper" for the highcharts component
 * See https://lhorie.github.io/mithril/integration.html 
 */
var mChart = {
    //Returns a chart
    view: function(ctrl, attrs) {
        //Create a chart -> attrs.data = item
        return m("div", {id: attrs.data.nid, config: mChart.config(attrs) });
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
                    var chart = Highcharts.chart(element, ctrl.data.charts[0].options);
                    m.endComputation();

                }                
            } else {
                console.warn('ERROR: You need highcharts in the page');
            }
        };
    }
};

var app = m.module(document.getElementById("main-container"), App);
