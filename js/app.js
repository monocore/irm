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
                me.data = mydata;
                m.redraw();
            });
    }
}
var nestLevel = 1;
var App = {
    service: requestWrapper({method: "GET", url: "/json/data.json"}),
    view: function () {
        return [
            drawLevels(App.service.data.tree),
            this.service.failed ? [m("h4", "Error loading data: "), m("p", "Error status: " + this.service.errorStatus)] : ''
        ];

        function drawLevels(children) {
            if (!App.service.success) {
                return;
            }
            console.log(nestLevel);
            if (children) {
                return m("ol", {class: "level level" + nestLevel},
                    children.map(function (item) {
                        if (item.children) {
                            nestLevel++;
                            return m("li", {class: "big-li"}, m("a", m("h2", item.name)), drawLevels(item.children));
                            nestLevel--;
                        }
                        else {
                            if (item.nid) {//expect teaser etc
                                return m("li", {class: "expander bottom-level"},
                                    m("div", {class: "row"},
                                        m("div", {class:"col1"},
                                            m("a", m("h2", item.name))),
                                        m("div", {class:"col2"},
                                            m("span", {class: "status-detail " + item.status})
                                        )
                                    ),
                                    m("div", {class: "hidable hidden"},
                                        m("div", {class: "row"},
                                            m("div", {class: "col1"}, m("p", item.teaser)),
                                            m("div", {class: "col2"}, drawHistory(item))
                                        )
                                    )
                                );
                            } else {
                                return m("li", {class: "bottom-level"}, m("a", m("h2", item.name)));
                            }
                        }
                    })
                );
            }
        }

        function drawHistory(item) {
            if (!App.service.success) {
                return;
            }
            return m("ol", item.statushistory.map(function (row) {
                return m("li", {class: row.status}, row.period);
            }));
        }

    }
}
m.module(document.getElementById("tree"), App);
