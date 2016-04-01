var requestWrapper = function (opts) {
    return new function () {
        me = this;
        me.opts = opts;
        me.success = me.loading = me.failed = false;
        me.errorStatus = me.errorBody = '';
        me.data = null;
        me.opts.background = true;
        me.opts.extract = function (xhr) {
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
            .then(function (mydata) { // success!
                me.success = true;
                me.failed = me.loading = false;
                me.data = mydata;
                m.redraw();
            });
    }
}

var App = {
    service: requestWrapper({method: "GET", url: "/json/data.json"}),    
    view: function () {
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
                    m("span", {class: "logo"}),
                    m("h1", {id: "title"}, data.title)
                ),
                m("div", {id: "tree"}, drawNodes(data.tree, false))
            ]
        }

        function drawNodes(children, nested) {
            if (nested) {
                App.nestLevel++;
            }
            if (children) {
                var hidden = nested ? "hidden" : "";
                return m("ol", {class: "level " + hidden},
                    children.map(function (item) {
                        if (item.children) {
                            return m("li",
                                m("a", {
                                    class: "big-a expander status-" + item.status,
                                    onclick: function () {
                                        //hide all sibling li's
                                        toggleSiblings(this.parentNode, this);
                                        //show the adjacent list(ol)
                                        this.nextElementSibling.classList.toggle("hidden");
                                    }
                                }, m("h2", m("i", {class:"fa fa-chevron-right"}), item.name)), drawNodes(item.children, true)
                            );
                        }
                        else {
                            if (item.nid) {//expect teaser etc
                                return drawEndNode(item);
                            } else {                                
                                return m("li", m("a", {class: "big-a bottom-level status-" + item.status}, m("h2", item.name)));
                            }
                        }
                    })
                );
            }
        }

        function drawEndNode(item) {            
            return m("li", {class: "bottom-level"},
                m("a[href='javascript:;']", {
                        class: "detail expander", onclick: function () {
                            this.nextElementSibling.classList.toggle("hidden");
                        }
                    },
                    m("div", {class: "row"},
                        m("div", {class: "col1"},
                            m("p", {class: "detail-title"}, item.name)),
                        m("div", {class: "col2"},
                            m("span", {class: "status-detail " + item.status}))
                    )
                ),
                m("div", {class: "hidable hidden"},
                    m("div", {class: "row"},
                        m("div", {class: "col1"}, m("p", item.teaser)),
                        m("div", {class: "col2"}, drawHistory(item)),
                        m("button", {onclick: function(){
                            showNode(this.nextElementSibling, item.nid);
                        }}, "details"),
                            m("div", {class: "popup-node hidden"}, m("i", {class:"fa fa-times", onclick: function(){
                                this.parentNode.classList.toggle("hidden");
                            }}),
                                m("div", {class: "content"})
                            )                        
                    )
                )               
                
            );
        }

        function drawHistory(item) {
            if (!App.service.success) {
                return;
            }
            return m("ol", item.statushistory.map(function (row) {
                return m("li", {class: "status-detail-mini " + row.status}, row.period);
            }));
        }
    }
}

function toggleSiblings(el, current) {
    //If node only contains endnodes dont compress siblings
    if (current.nextSibling.children[0].classList.contains("bottom-level")) {
        return;
    }
    var siblings  = el.parentNode.children;
    for (var i=0; i < siblings.length; i++){
        siblings[i].classList.toggle("hidden");
    }
    el.classList.toggle("hidden");
    el.classList.toggle("hierarchy");
}

function showNode(element, nid) {
    $(".content", element).load("/json/node-" + nid.toString() + ".html", function(){
        element.classList.toggle("hidden");
        height = $(window).height() -70;   // returns height of browser viewport        
        width = $(window).width() -70;
        $(element).css({"width" : width, "height" : height});
        Chartist.Line('.ct-chart', data, options);        
    });
}

m.module(document.getElementById("main-container"), App);