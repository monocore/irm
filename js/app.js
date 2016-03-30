/**
 * Created by vries.j on 3/24/16.
 */
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
                me.data = setStatus(mydata);
                m.redraw();
            });
    }
}

var App = {
    service: requestWrapper({method: "GET", url: "/json/data.json"}),
    view: function () {
        return [
            drawLevels(App.service.data.tree, false),
            this.service.failed ? [m("h4", "Error loading data: "), m("p", "Error status: " + this.service.errorStatus)] : ''
        ];

        function drawLevels(children, nested) {
            if (!App.service.success) {
                return;
            }
            if (children) {
                var hidden = nested ? "hidden" : "";
                return m("ol", {class: "level " + hidden},
                    children.map(function (item) {
                        if (item.children) {
                            return m("li",
                                m("a", { class: "big-a expander status-" + item.status,                                        
                                         onclick: function () {
                                    this.nextElementSibling.classList.toggle("hidden");
                                    this.nextElementSibling.classList.toggle("viewing");
                                    document.getElementById("title").innerHTML = item.name;
                                }},m("h2", item.name)), drawLevels(item.children, true)
                            );
                        }
                        else {
                            if (item.nid) {//expect teaser etc
                                return drawBottomLevelItem(item);
                            } else {
                                return m("li", m("a", {class: "big-a bottom-level status-" + item.status}, m("h2", item.name)));
                            }
                        }
                    })
                );
            }
        }

        function drawBottomLevelItem(item){
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
                        m("div", {class: "col2"}, drawHistory(item))
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

function setStatus(json) {
    console.log(json);
    json.tree.forEach(function(parent, parentIndex) {
        console.log(parent)
        if (parent.children) {
            parent.children.forEach(function(child, index) {
                var status = "green";
                if (child.children) {
                    //recurse
                    // ...
                    json.tree[parentIndex].children[index].status = status;
                } else {
                    //bottomlevel item, should have status set by server
                }    
            });
        } else {
            //no children, status should be set by server            
            //if no status is set, leave it as it will be rendered as status-undefined            
        }
    }, this);
    console.log(json);
    return json;
}

m.module(document.getElementById("tree"), App);
