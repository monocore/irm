/**
 * Created by vries.j on 3/17/16.
 */

$(document).ready(function() {
    $("a.expander").on("click", function (){
        $(this).next(".hidable").first().toggle();
    });
    $("li.expander").on("click", function (){
        $(this).children(".hidable").first().toggle();
    });
});

