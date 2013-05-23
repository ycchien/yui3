var Model,
    View,
    sub = Y.Lang.sub,
    CLASS_DISABLED = 'control-disabled',
    EVENT_UI = 'paginator:ui';

Model = Y.Base.create('dt-pg-model', Y.Model, [Y.Paginator.Core]),

View = Y.Base.create('dt-pg-view', Y.View, [], {

    _eventHandles: [],

    containerTemplate: '<div class="yui3-datatable-paginator"/>',

    buttonTemplate: '<a href="#{type}" class="control control-{type}" data-type="{type}">{label}</a>',

    contentTemplate: '{buttons}{goto}{perPage}',

    initializer: function () {
        var container = this.get('container'),
            events = this._eventHandles;

        this._initStrings();

        container.delegate('click', this._controlClick, '.control', this);

        events.push(
            container.after('change', this._controlChange, this, 'select'),
            container.after('submit', this._controlSubmit, this, 'form'),
            this.get('model').after('change', this._modelChange, this)
        );
    },

    destructor: function () {
        while( this._eventHandles.length) {
            this._eventHandles.shift().detach();
        }
        if (this._wrapper) {
            this._wrapper.remove(true);
        }
    },

    render: function () {
        var model = this.get('model'),
            content = Y.Lang.sub(this.contentTemplate, {
                'buttons': this._buildButtonsGroup(),
                'goto': this._buildGotoGroup(),
                'perPage': this._buildPerPageGroup()
            });

        this.get('container').append(content);

        this._rendered = true;

        this._updateControlsUI(model.get('page'));
        this._updateItemsPerPageUI(model.get('itemsPerPage'));

        return this;
    },

    _buildButtonsGroup: function () {
        var temp = this.buttonTemplate,
            strings = this.get('strings');

        return '<div class="controls group">' +
                    sub(temp, { type: 'first', label: strings.first} ) +
                    sub(temp, { type: 'prev', label: strings.prev }) +
                    sub(temp, { type: 'next', label: strings.next }) +
                    sub(temp, { type: 'last', label: strings.last }) +
                '</div>';
    },

    _buildGotoGroup: function () {
        var strings = this.get('strings');

        return '<form action="#" class="group">' +
                    '<label>' + strings.goToLabel +
                    '<input type="text" value="' + this.get('model').get('page') + '">' +
                    '<button>' + strings.goToAction + '</button>' +
                    '</label>' +
                '</form>';
    },

    _buildPerPageGroup: function () {
        // return {string} div containing a label and select of options
        var strings = this.get('strings'),
            select = '<div class="group per-page">' +
                        '<label>' + strings.perPage + ' <select>',
            options = this.get('pageSizes'),
            i,
            len;

        for (i=0, len = options.length; i < len; i++) {
            select += '<option value="' +
                        ( options[i].value || options[i] ) + '">' +
                        ( options[i].label || options[i] ) + '</option>';
        }

        select += '</select></label></div>';

        return select;

    },

    _modelChange: function (e) {
        // update control states based on changes
        var changed = e.changed,
            page = (changed && changed.page),
            itemsPerPage = (changed && changed.itemsPerPage);

        if (page) {
            this._updateControlsUI(page.newVal);
        }
        if (itemsPerPage) {
            this._updateItemsPerPageUI(itemsPerPage.newVal);
            if (!page) {
                this._updateControlsUI(e.target.get('page'));
            }
        }

    },

    _updateControlsUI: function (val) {
        if (!this._rendered) {
            return;
        }

        var model = this.get('model'),
            container = this.get('container'),
            hasPrev = model.hasPrevPage(),
            hasNext = model.hasNextPage();

        container.one('.control-first').toggleClass(CLASS_DISABLED, !hasPrev);
        container.one('.control-prev').toggleClass(CLASS_DISABLED, !hasPrev);
        container.one('.control-next').toggleClass(CLASS_DISABLED, !hasNext);
        container.one('.control-last').toggleClass(CLASS_DISABLED, !hasNext);

        container.one('form input').set('value', val);
    },

    _updateItemsPerPageUI: function (val) {
        if (!this._rendered) {
            return;
        }

        this.get('container').one('select').set('value', val);
    },

    _controlClick: function (e) { // buttons
        e.preventDefault();
        var control = e.currentTarget;
        // register click events from the four control buttons
        if (control.hasClass(CLASS_DISABLED)) {
            return;
        }
        this.fire(EVENT_UI, {
            type: control.getData('type'),
            val: control.getData('page') || null
        });
    },

    _controlChange: function (e, selector) {

        var control = e.target;
        // register change events from the perPage select
        if (
            control.hasClass(CLASS_DISABLED) ||
            (
                selector &&
                !Y.Selector.test(control.getDOMNode(), selector)
            )
        ) {
            return;
        }

        var val = e.target.get('value');
        this.fire(EVENT_UI, { type: 'perPage', val: parseInt(val, 10) });
    },

    _controlSubmit: function (e, selector) {
        var control = e.target;
        if (
            control.hasClass(CLASS_DISABLED) ||
            (
                selector &&
                !Y.Selector.test(control.getDOMNode(), selector)
            )
        ) {
            return;
        }

        // the only form we have is the go to page form
        e.preventDefault();

        var input = e.target.one('input');
        this.fire(EVENT_UI, { type: 'page', val: input.get('value') });
    },

    _initStrings: function () {
        // Not a valueFn because other class extensions will want to add to it
        this.set('strings', Y.mix((this.get('strings') || {}),
            Y.Intl.get('datatable-paginator')));
    }
}, {
    ATTRS: {
        pageSizes: {
            value: [10, 50, 100, { label: 'Show All', value: -1 }]
        }
    }
});

function Controller () {}

Controller.ATTRS = {
    paginatorModel: {
        setter: '_setPaginatorModel',
        value: null,
        writeOnce: 'initOnly'
    },

    paginatorModelType: {
        getter: '_getConstructor',
        value: 'DataTable.Paginator.Model',
        writeOnce: 'initOnly'
    },

    paginatorView: {
        getter: '_getConstructor',
        value: 'DataTable.Paginator.View',
        writeOnce: 'initOnly'
    },

    // PAGINATOR CONFIGS
    pageSizes: {
        setter: '_setPageSizesFn',
        value: [10, 50, 100, { label: 'Show All', value: -1 }]
    },
    rowsPerPage: {

    },
    paginatorLocation: {
        value: 'footer'
    }
};

Y.mix(Controller.prototype, {

    // Sugar
    // would like to abstract this into something like table.page.next()
    page: function () {
        return {
            go: function (num) {
                console.log(num);
            }
        };
    },

    firstPage: function () {
        this.get('paginatorModel').set('page', 1);
        return this;
    },
    lastPage: function () {
        var model = this.get('paginatorModel');
        model.set('page', model.get('totalPages'));
        return this;
    },
    previousPage: function () {
        this.get('paginatorModel').prevPage();
        return this;
    },
    nextPage: function () {
        this.get('paginatorModel').nextPage();
        return this;
    },


    /// Init and protected
    initializer: function () {
        var ModelClass = this.get('paginatorModel'),
            model;

        if (!Y.Lang.isObject(ModelClass, true)) {
            model = new ModelClass();
            this.set('paginatorModel', model);
        } else {
            model = ModelClass;
        }

        // allow DT to use paged data
        this._augmentData();

        // ensure our model has the correct totalItems set
        model.set('totalItems', this.get('data').size());

        if (!this._eventHandles.paginatorRender) {
            this._eventHandles.paginatorRender = Y.Do.after(this._paginatorRender, this, 'render');
        }
    },

    _paginatorRender: function () {
        this._paginatorRenderUI();
        this.get('paginatorModel').after('change', this._afterModelChange, this);
        this.after('dataChange', this._renderPg, this);
        this.after('rowsPerPageChange', this._afterRowsPerPageChange, this);
    },

    _afterRowsPerPageChange: function (e) {
        var data = this.get('data'),
            model = this.get('paginatorModel'),
            view;

        if (e.newVal !== null) {
            // turning on
            this._paginatorRenderUI();

            if (!(data._paged)) {
                this._augmentData();
            }

            data._paged.index = (model.get('page') - 1) * model.get('itemsPerPage');
            data._paged.length = model.get('itemsPerPage');

        } else if (e.newVal === null) {
            // destroy!
            while(this._pgViews.length) {
                view = this._pgViews.shift();
                view.destroy({ remove: true });
                view = null;
            }

            data._paged.index = 0;
            data._paged.length = undefined;
        }

        console.log(this._pgViews);
        this.get('paginatorModel').set('itemsPerPage', parseInt(e.newVal, 10));
    },

    _paginatorRenderUI: function () {
        var views = this._pgViews,
            ViewClass = this.get('paginatorView'),
            viewConfig = {
                pageSizes: this.get('pageSizes'),
                model: this.get('paginatorModel')
            },
            locations = this.get('paginatorLocation');

        if (!Y.Lang.isArray(locations)) {
            locations = [locations];
        }

        if (!views) { // set up initial rendering of views
            views = this._pgViews = [];
            // for each placement area, push to views
        }

        Y.Array.each(locations, function (location) {
            var view = new ViewClass(viewConfig),
                container = view.render().get('container'),
                row;

            view.after('*:ui', this._uiPgHandler, this);
            views.push(view);

            if (location._node) { // assume Y.Node
                location.append(container);
            } else if (location === 'footer') {
                if (!this.foot) {
                    this.foot = new Y.DataTable.FooterView({ host: this });
                    this.foot.render();
                    this.fire('renderFooter', { view: this.foot });
                }
                row = Y.Node.create('<tr><td class="yui3-datatable-paginator-wrapper" colspan="' + this.get('columns').length + '"/></tr>');
                view._wrapper = row;
                row.one('td').append(container);
                this.foot.tfootNode.append(row);
            } else if (location === 'header') {
                if (this.view && this.view.tableNode) {
                    this.view.tableNode.insert(container, 'before');
                } else {
                    this.get('contentBox').prepend(container);
                }
            }
        }, this);

    },

    _uiPgHandler: function (e) {
        // e.type = control type (first|prev|next|last|page|perPage)
        // e.val = value based on the control type to pass to the model
        var model = this.get('paginatorModel');

        switch (e.type) {
            case 'first':
                model.set('page', 1);
                break;
            case 'last':
                model.set('page', model.get('totalPages'));
                break;
            case 'prev':
            case 'next':
                model[e.type + 'Page']();
                break;
            case 'page':
                model.set('page', e.val);
                break;
            case 'perPage':
                model.set('itemsPerPage', e.val);
                model.set('page', 1);
                break;
        }
    },

    _afterModelChange: function (e) {
        var model = this.get('paginatorModel'),
            data = this.get('data');

        if (!data._paged) {
            this._augmentData();
        }

        data._paged.index = (model.get('page') - 1) * model.get('itemsPerPage');
        data._paged.length = model.get('itemsPerPage');

        data.fire.call(data, 'reset', {
            src: 'reset',
            models: data._items.concat()
        });
    },

    // TODO: re run if data is changed... after data change check for _paged
    _augmentData: function () {
        var model = this.get('paginatorModel');

        Y.mix(this.get('data'), {

            _paged: {
                index: (model.get('page') - 1) * model.get('itemsPerPage'),
                length: model.get('itemsPerPage')
            },

            getPage: function () {
                var _pg = this._paged,
                    min = _pg.index,
                    max = (_pg.length >= 0) ? min + _pg.length : undefined;

                return this._items.slice(min, max);
            },

            size: function (paged) {
                return (paged && this._paged.length >=0 ) ?
                            this._paged.length :
                            this._items.length;
            },

            each: function (callback, thisObj) {
                var items = this.getPage(),
                    i, item, len;

                for (i = 0, len = items.length; i < len; i++) {
                    item = items[i];
                    callback.call(thisObj || item, item, i, this);
                }

                return this;
            }
        }, true);
    },

    _setPageSizesFn: function (val) {
        var i,
            len = val.length,
            label,
            value;

        if (!Y.Lang.isArray(val)) {
            val = [val];
            len = val.length;
        }

        for ( i = 0; i < len; i++ ) {
            if (typeof val[i] !== 'object') {
                label = val[i];
                value = val[i];

                // we want to check to see if we have a number or a string
                // of a number. if we do not, we want the value to be -1 to
                // indicate "all rows"
                if (parseInt(value, 10) != value) {
                    value = -1;
                }
                val[i] = { label: label, value: value };
            }
        }

        return val;
    },

    _setPaginatorModel: function (model) {
        var ModelConstructor = this.get('paginatorModelType');

        if (!(model && model._isYUIModel)) {
            model = new ModelConstructor(model);
        }

        return model;
    },

    _getConstructor: function (type) {
        return typeof type === 'string' ?
            Y.Object.getValue(Y, type.split('.')) :
            type;
    }

}, true);


Y.DataTable.Paginator = Controller;
Y.DataTable.Paginator.Model = Model;
Y.DataTable.Paginator.View = View;

Y.Base.mix(Y.DataTable, [Y.DataTable.Paginator]);