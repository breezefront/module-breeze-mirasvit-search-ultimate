/* global _ ko $t */
define([
    'jquery',
    'Mirasvit_Search/js/highlight'
], function ($, highlight) {
    'use strict';

    $.mixin('quickSearch', {
        component: false
    });

    // copy of mirasvit/module-search-ultimate/src/SearchAutocomplete/view/frontend/web/js/autocomplete.js
    var Autocomplete = function (input) {
        this.$input = $(input);
        this.isVisible = false;
        this.isShowAll = true;
        this.loading = false;
        this.config = [];
        this.result = false
    };

    Autocomplete.prototype = {
        placeholderSelector:      '.mst-searchautocomplete__autocomplete',
        wrapperSelector:          '.mst-searchautocomplete__wrapper',
        additionalColumnSelector: 'mst-2-cols',
        model:                    null,

        init: function (config) {
            this.config = _.defaults(config, this.defaults);
            window.priceFormat = this.config.priceFormat;

            this.doSearch = _.debounce(this._doSearch, this.config.delay);

            this.$input.after($('#searchAutocompletePlaceholder').html());

            this.xhr = null;

            this.$input.on("keyup", function (event) {
                this.clickHandler(event)
            }.bind(this));

            this.$input.on("focus", function (event) {
                event.stopPropagation();
                this.clickHandler(event)
            }.bind(this));

            this.$input.on("input", function () {
                this.inputHandler()
            }.bind(this));

            $(document).on("click.mst-searchautocomplete", function (event) {
                //event.stopPropagation(); // breeze fix: broken turbo
                this.clickHandler(event);
            }.bind(this));

            ko.bindingHandlers.highlight = {
                init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                    highlight(element, bindingContext.$parents[2].result().query, 'mst-searchautocomplete__highlight');
                }
            };

            ko.bindingHandlers.processStockStatus = {
                init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                    var value = $(element).text();
                    if (value == 2) {
                        value = $t('In stock');
                        $(element).addClass('inStock');
                    } else {
                        value = $t('Out Of Stock');
                        $(element).addClass('outOfStock');
                    }

                    $(element).text(value);
                }
            };
        },

        clickHandler: function (event) {
            if (!event || event.type == 'focusin') { // breeze fix: focus => focusin
                if (event.target.value.length >= this.config.minSearchLength) {
                    this.setActiveState(true);
                }
                this.ensurePosition();
                if (this.result) {
                    this.setActiveState(true);
                    setInterval(function () {
                        this.ensurePosition();
                    }.bind(this), 10);
                } else {
                    this.result = this.search();
                    if (this.result) {
                        this.setActiveState(true);
                        this.ensurePosition(); // breeze fix
                    }
                }
            } else {
                if (event.keyCode === 13) {
                    $(event.target).closest('form').submit();
                    return true;
                }

                if ($(event.target)[0] == $('label[data-role=minisearch-label]')[0]) {
                    if ($('body').hasClass('searchautocomplete__active')) {
                        this.setActiveState(false);
                        return false;
                    } else {
                        this.setActiveState(true);
                        return true;
                    }
                }

                if ($(event.target)[0] != this.$input[0] && !$(event.target).closest(this.$placeholder()).length) {
                    this.setActiveState(false);
                    return false;
                }

                if ($(event.target).hasClass('mst-searchautocomplete__close')) {
                    this.setActiveState(false);
                    return false;
                }

            }
        },

        setActiveState: function (isActive) {
            $('body').toggleClass('searchautocomplete__active', isActive);
            this.$input.toggleClass('searchautocomplete__active', isActive);
            this.$placeholder().toggleClass('_active', isActive);

            //magento minisearch
            $(this.$input[0].form).toggleClass('active', isActive);
            $(this.$input[0].labels).each(function (key, label) {
                $(label).toggleClass('active', isActive);
            });
        },

        inputHandler: function () {
            $('body').addClass('searchautocomplete__active');

            this.result = this.search();

            setTimeout(function () {
                if (this.result) {
                    this.$placeholder().addClass('_active');
                    this.ensurePosition();
                } else {
                    this.$placeholder().removeClass('_active');
                }
            }.bind(this), 200);

            this.ensurePosition();
        },

        $spinner: function () {
            return this.$placeholder().find(".mst-searchautocomplete__spinner");
        },

        search: function () {
            if ($(this.$input).val().length > 0) {
                $('.actions .action.search').prop('disabled', false);
            }

            this.ensurePosition();

            this.$input.off("keydown");
            this.$input.off("blur");

            if (this.xhr != null) {
                //this.xhr.abort(); // breeze fix
                this.xhr = null;
            }

            if (this.$input.val().length >= this.config.minSearchLength) {
                this.doSearch(this.$input.val());
            } else {
                this.$placeholder().removeClass(this.additionalColumnSelector);
                return this.doPopular();
            }

            return true;
        },

        _doSearch: function (query) {
            //this.$wrapper().remove();
            this.isVisible = true;

            this.$spinner().show();

            this.xhr = $.ajax({
                url:      this.config.url,
                dataType: 'json',
                type:     'GET',
                data:     {
                    q:        query,
                    store_id: this.config.storeId,
                    cat:      false,
                    currency: this.config.currency,
                },
                success:  function (data) {
                    this.processApplyBinding(data);

                    this.$spinner().hide();
                }.bind(this)
            });
        },

        viewModel: function (data) {
            if (this.model === null) {
                this.model = {
                    result:  ko.observable({}),
                    config:  this.config,
                    loading: ko.observable(false),

                    onMouseOver: function (item, event) {
                        $(event.currentTarget).addClass('_active');
                    }.bind(this),

                    onMouseOut: function (item, event) {
                        $(event.currentTarget).removeClass('_active');
                    }.bind(this),

                    afterRender: function (el) {
                        $(el).catalogAddToCart({});
                    }.bind(this),

                    onClick: function (item, event) {
                        if (event.button === 0) { // left click
                            event.preventDefault();

                            if ($(event.target).closest('.tocart').length || $(event.target).closest('.mst__add_to_cart').length) {
                                return this.processAddToCart(event);
                            }

                            if (event.target.nodeName === 'A'
                                || event.target.nodeName === 'IMG'
                                || event.target.nodeName === 'LI'
                                || event.target.nodeName === 'SPAN'
                                || event.target.nodeName === 'DIV') {

                                this.enter(item);
                            }
                        }
                    }.bind(this),

                    onSubmit: function (item, event) {
                    }.bind(this),

                    bindPrice: function (item, event) {
                        return true;
                    }.bind(this)
                };
            }

            this.model.loading(this.loading);
            this.model.result(data);
            this.model.result().isShowAll = this.isShowAll;

            let form_key = '';
            try {
                form_key = document.cookie.match('(^|;) ?form_key=([^;]*)(;|$)')[2];
            } catch (error) {
                form_key = document.cookie.match('(^|;) ?form_key=([^;]*)(;|$)');
            }

            this.model.form_key = form_key;

            return this.model;
        },

        enter: function (item) {
            if (item.url) {
                window.location.href = item.url;
            } else {
                this.pasteToSearchString(item.query);
            }
        },

        pasteToSearchString: function (searchTerm) {
            this.$input.val(searchTerm);
            this.search();
        },

        doPopular: function () {
            this.$spinner().hide();
            if (this.config.popularSearches.length) {
                this.processApplyBinding(this._showQueries(this.config.popularSearches));

                return true;
            }

            return false;
        },

        processApplyBinding: function (data) {
            if (this.model === null) {
                if (this.$wrapper().length > 0) {
                    if (!!ko.dataFor(this.$wrapper())) {
                        ko.cleanNode(this.$wrapper());
                    }
                }

                this.$wrapper().remove();
                const wrapper = $('#searchAutocompleteWrapper').html();

                this.$placeholder().append(wrapper);

                this.viewModel(data);

                ko.applyBindings(this.model, this.$wrapper()[0]);
            }

            this.viewModel(data)

            if (this.config.layout === '2columns' && Object.keys(data.indexes).length > 1) {
                const result = {};
                data.indexes.forEach(function (index) {
                    if (index.items.length > 0) {
                        result[index.identifier] = index.items.length;
                    }
                });

                if (Object.keys(result).length > 1 && typeof result.magento_catalog_product != 'undefined') {
                    this.$placeholder().addClass(this.additionalColumnSelector);
                } else {
                    this.$placeholder().removeClass(this.additionalColumnSelector);
                }
            }

            this.ensurePosition();
        },

        $placeholder: function () {
            return $(this.$input.next(this.placeholderSelector));
        },

        $wrapper: function () {
            return $(this.$input.next(this.placeholderSelector).find(this.wrapperSelector));
        },

        _showQueries: function (data) {
            let self = this;
            let queries = data;
            let items = [];
            let item;
            let result, index;

            _.each(queries, function (query, idx) {
                item = {};
                item.query = query;
                item.enter = function () {
                    self.query = query;
                };

                items.push(item);
            }, this);

            result = {
                totalItems: items.length,
                noResults:  items.length === 0,
                query:      this.$input.val(),
                indexes:    []
            };

            index = {
                totalItems:   items.length,
                isShowTotals: false,
                items:        items,
                identifier:   'popular',
                title:        this.config.popularTitle
            };

            result.indexes.push(index);

            return result;
        },
        processAddToCart: function(event) {
            let linkToCart = $(event.target).parent('.mst__add_to_cart').attr('_href');
            if (this.config.isAjaxCartButton) {
                this.xhr = $.ajax({
                    url:      linkToCart,
                    dataType: 'json',
                    type:     'GET',
                    success:  function (data) {
                        let message = '<div class="to_cart_message ' + (data.success ? 'success' : 'error') + '">' + data.message + '</div>';
                        //this.reloadCart(); // breeze not used on cart page
                        $.customerData.reload(['cart'], true);// breeze fix
                        $(event.target).closest('.to-cart').parent().prepend(message);
                        setTimeout(function() {
                            $(event.target).closest('.to-cart').parent().find('.to_cart_message').remove();
                        }, 5000);
                    }.bind(this)
                });
            } else {
                $(event.target).closest('.mst__add_to_cart').attr('href', linkToCart);// breeze fix: removed trigger click causing double add to cart
            }

            return false;
        },
        reloadCart: function() {
            var form = $('form#form-validate');
            $.ajax({
                url: form.attr('action'),
                data: form.serialize(),
                success: function (res) {
                    var parsedResponse = $.parseHTML(res);
                    var result = $(parsedResponse).find("#form-validate");
                    var sections = ['cart'];
                    $("#form-validate").replaceWith(result);
                    $.customerData.reload(sections, true);// breeze fix

                }
            });
        },
        ensurePosition: function () {
            var position = this.$input.position();
            var width = this.$placeholder().outerWidth();
            var left = position.left + parseInt(this.$input.css('marginLeft'), 10) + this.$input.outerWidth() - width;
            var top = position.top + parseInt(this.$input.css('marginTop'), 10);

            this.$placeholder()
                .css('top', this.$input.outerHeight() - 1 + top)
                .css('left', left)
                .css('width', this.$input.outerWidth());
        },
        /**
         * Breeze: cleanup content for Turbo
         */
        destroy: function() {
            this.$input.val('');
            $('.mst-searchautocomplete__autocomplete').remove();
            this.$input.off('keyup focus input');
            $(document).off("click.mst-searchautocomplete");
            this.result = false;
        }
    };

    if ($.breezemap) {
        $.breezemap['Mirasvit_SearchAutocomplete/js/autocomplete'] = Autocomplete;
    }

    return Autocomplete;
});
