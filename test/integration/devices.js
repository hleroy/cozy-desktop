import { device } from 'cozy-device-sdk';
import should from 'should';

import Cozy from '../helpers/integration';


describe("device", function() {
    this.slow(1000);
    this.timeout(10000);

    before(Cozy.ensurePreConditions);

    describe('pingCozy', function() {
        it('says OK when the URL belongs to a cozy', done =>
            device.pingCozy(Cozy.url, function(err) {
                should.not.exist(err);
                return done();
            })
        );

        return it('says KO else', done =>
            device.pingCozy('http://localhost:12345', function(err) {
                should.exist(err);
                return done();
            })
        );
    });

    describe('checkCredentials', function() {
        it('says OK with good credentials', done =>
            device.checkCredentials(Cozy.url, Cozy.password, function(err) {
                should.not.exist(err);
                return done();
            })
        );

        return it('says KO with bad credentials', done =>
            device.checkCredentials(Cozy.url, 'xxxxxxxx', function(err) {
                should.exist(err);
                return done();
            })
        );
    });

    let devicePasswords = [];

    describe('registerDeviceSafe', function() {
        it('gives an error when the password is invalid', function(done) {
            let register = device.registerDeviceSafe;
            return register(Cozy.url, Cozy.deviceName, 'xxxxxxxx', function(err) {
                err.should.equal('Bad credentials');
                return done();
            });
        });

        it('register a device', function(done) {
            let register = device.registerDeviceSafe;
            return register(Cozy.url, Cozy.deviceName, Cozy.password, function(err, res) {
                should.not.exist(err);
                should.exist(res);
                should.exist(res.password);
                should.exist(res.deviceName);
                res.deviceName.should.equal(Cozy.deviceName);
                devicePasswords.push(res.password);
                return done();
            });
        });

        it('register a device with a suffix when it already exists', function(done) {
            let register = device.registerDeviceSafe;
            return register(Cozy.url, Cozy.deviceName, Cozy.password, function(err, res) {
                should.not.exist(err);
                should.exist(res);
                should.exist(res.password);
                should.exist(res.deviceName);
                res.deviceName.should.not.equal(Cozy.deviceName);
                res.deviceName.should.match(/-2$/);
                devicePasswords.push(res.password);
                return done();
            });
        });

        return it('register a device with a suffix when it already exists', function(done) {
            let register = device.registerDeviceSafe;
            return register(Cozy.url, Cozy.deviceName, Cozy.password, function(err, res) {
                should.not.exist(err);
                should.exist(res);
                should.exist(res.password);
                should.exist(res.deviceName);
                res.deviceName.should.not.equal(Cozy.deviceName);
                res.deviceName.should.match(/-3$/);
                devicePasswords.push(res.password);
                return done();
            });
        });
    });

    return describe('unregisterDevice', function() {
        it('gives an error when the password is invalid', function(done) {
            let unregister = device.unregisterDevice;
            return unregister(Cozy.url, Cozy.deviceName, 'xxxxxxxx', function(err) {
                should.exist(err);
                if (err.message === 'Bad credentials') {
                    err.message.should.equal('Bad credentials');
                } else {
                    err.message.should.equal('Request unauthorized');
                }
                return done();
            });
        });

        it('unregister a device', function(done) {
            let unregister = device.unregisterDevice;
            return unregister(Cozy.url, Cozy.deviceName, devicePasswords[0], function(err) {
                should.not.exist(err);
                return done();
            });
        });

        it('unregister a device (bis)', function(done) {
            let deviceName = `${Cozy.deviceName}-2`;
            let unregister = device.unregisterDevice;
            return unregister(Cozy.url, deviceName, devicePasswords[1], function(err) {
                should.not.exist(err);
                return done();
            });
        });

        return it('unregister a device (ter)', function(done) {
            let deviceName = `${Cozy.deviceName}-3`;
            let unregister = device.unregisterDevice;
            return unregister(Cozy.url, deviceName, devicePasswords[2], function(err) {
                should.not.exist(err);
                return done();
            });
        });
    });
});
