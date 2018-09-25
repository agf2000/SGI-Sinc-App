const {
    ipcRenderer,
    remote
} = eRequire('electron');
const fse = eRequire('fs-extra');
const storage = eRequire('electron-json-storage');

let destPath = 'c:\\softer\\Sincronizador\\config',
    config = null;
fse.mkdirsSync(destPath);

$(function () {
    storage.setDataPath(destPath);

    $('#configPasswordModal').modal();

    fse.readFile(`${destPath}\\config.json`, function (err, data) {
        if (err) {
            return console.log(err);
        }
        let fileRead = fse.readFileSync(`${destPath}\\config.json`, 'utf8');
        config = JSON.parse(fileRead);

        $('#broadServer').val(config.broadServer);
        $('#allowNoti').prop('checked', config.allowNoti);

        Materialize.updateTextFields();
    });

    $('#btnConfig').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        if ($('#configPasswd').val() == 'sftk123') {
            $('#configPasswordModal').modal('close');

            let params = {
                broadServer: $('#broadServer').val(),
                allowNoti: $('#allowNoti').prop('checked'),
                syncStock: config.syncStock,
                syncActive: config.syncActive,
                syncNewItems: config.syncNewItems,
                syncNewPeople: config.syncNewPeople,
                syncNewProducts: config.syncNewProducts,
                syncComission: config.syncComission,
                syncCost: config.syncCost,
                syncPrice: config.syncPrice,
                canSync: config.canSync,
                canRep: config.canRep,
                syncGroup: config.syncGroup,
                syncCategory: config.syncCategory
            };

            storage.set('config', params, function (error) {
                if (error)
                    throw error;

                new PNotify({
                    title: "Sucesso",
                    text: "Configuração salva. Lembre de recarregar a tela principal.",
                    type: 'success',
                    icon: false
                });
            });

            $('#syncsPasswd').val(null);
        } else {
            new PNotify({
                title: "Senha inválida!",
                type: 'error',
                icon: false,
                addclass: "stack-bottomright",
                delay: 6000
            });

            $('#syncsPasswd').val(null);
        }
    });

    $('#btnCancel').click(function (e) {
        if (e.clientX === 0) {
            return false;
        }
        e.preventDefault();

        let win = remote.getCurrentWindow();
        win.close();
    });

});