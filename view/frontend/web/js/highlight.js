// copy of mirasvit/module-search-ultimate/src/Search/view/frontend/web/js/highlight.js
define(['jquery'], function ($) {
    'use strict';

    var result = function (element, query, cssClass) {
        let arQuery = query.split(' ');
        let arSpecialChars = [
            {'key': 'a', 'value': '(à|â|ą|a)'},
            {'key': 'c', 'value': '(ç|č|c)'},
            {'key': 'e', 'value': '(è|é|ė|ê|ë|ę|e)'},
            {'key': 'i', 'value': '(î|ï|į|i)'},
            {'key': 'o', 'value': '(ô|o)'},
            {'key': 's', 'value': '(š|s)'},
            {'key': 'u', 'value': '(ù|ü|û|ū|ų|u)'}
        ];

        $(element).each(function (index, item) {
            let html = $(item).text();
            arQuery.forEach(function (word, key) {
                if (word.trim()) { // breeze fix: $.trim(word) => word.trim()
                    word = word.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
                    arSpecialChars.forEach(function (match, idx) {
                        word = word.replace(new RegExp(match.key, 'g'), match.value);
                    });

                    if ("span".indexOf(word.toLowerCase()) === -1) {
                        html = html.replace(new RegExp('(' + word + '(?![^<>]*>))', 'ig'), function ($1, match) {
                            return '<span class="'+ cssClass +'">' + match + '</span>';
                        });
                    }
                }
            });
            $(item).html(html);
        });
    };

    if ($.breezemap) {
        $.breezemap['Mirasvit_Search/js/highlight'] = result;
    }

    return result;
});
