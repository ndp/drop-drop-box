import {OAuth2Client} from "./OAuth2Client";
import sinon from 'sinon'
import {TokenResponse} from './types'
import {InMemoryTokenStore} from "./TokenStore/InMemoryTokenStore";
import assert from "node:assert";

const AUTH_BASE_URL = 'https://foo.bar'

describe("OAuth2Client", function () {
  beforeEach(function () {
    this.tokenStore = new InMemoryTokenStore();
    this.client = new OAuth2Client({
        clientId: "clientid",
        clientSecret: "clientsecret",
        redirectUrl: "https://website.com:9999/callback",
        tokenStore: this.tokenStore,
        providerUrls: {
          userAuthBase: AUTH_BASE_URL,
          token: 'http//gimmetoken.com',
        }
      }
    );
    sinon.stub(this.client, "fetcher").returns(Promise.resolve({
      data: {
        access_token: "at",
        refresh_token: "rt",
        expires_in: 300
      }
    }));
    this.authURLConfig = {
      access_type: "offline",
      scope: "email profile",
      prompt: "consent"
    };
  });

  describe("generateAuthUrl", function () {
    it("returns a URL with the correct prefix", function () {
      const url = this.client.generateAuthUrl(this.authURLConfig);
      assert.match(url, new RegExp(AUTH_BASE_URL));
    });

    it("includes the access type", function () {
      const url = this.client.generateAuthUrl(this.authURLConfig);
      assert.match(url, new RegExp("access_type=offline"));
    });

    it("includes the scope", function () {
      const url = this.client.generateAuthUrl(this.authURLConfig);
      assert.match(url, new RegExp("scope=email%20profile"));
    });

    it("includes the prompt", function () {
      const url = this.client.generateAuthUrl(this.authURLConfig);
      assert.match(url, new RegExp("prompt=consent"));
    });

    it("includes the client ID", function () {
      const url = this.client.generateAuthUrl(this.authURLConfig);
      assert.match(url, new RegExp("client_id=clientid"));
    });

    it("includes the redirect URL", function () {
      const url = this.client.generateAuthUrl(this.authURLConfig);
      assert.match(url, new RegExp(`redirect_uri=${encodeURIComponent("https://website.com")}`));
    });
  });

  describe("exchangeAuthCodeForToken", function () {


    beforeEach(function () {
      this.tokenStore.save = sinon.spy();
      return this.client
        .exchangeAuthCodeForToken("auth")
        .then((result: TokenResponse) => {
          this.result = result;
        });
    });

    it("returns the tokens", function () {
      assert(this.result.tokens)
      assert.equal('at', this.result.tokens.access_token)
      assert.equal('rt', this.result.tokens.refresh_token)
    });

    it("emits an event with the tokens", function () {
      assert.equal(1, this.tokenStore.save.callCount);
      assert.equal('at', this.tokenStore.save.firstCall.args[0].access_token)
      assert.equal('rt', this.tokenStore.save.firstCall.args[0].refresh_token)
    });
  });

  describe('redirectPort', function () {
    it('finds port in URL', function () {
      assert.equal(9999, this.client.redirectPort)
    })
  })

  describe("auth code decoding", function () {
    beforeEach(function () {
      sinon.spy(this.client, "exchangeAuthCodeForToken");
    });

    afterEach(function () {
      this.client.exchangeAuthCodeForToken.restore();
    });

    it("encodes auth code", function () {
      const authCode = "4%2FY_x";
      this.client.exchangeAuthCodeForToken(authCode);
      assert.match(this.client.fetcher.getCall(0).args[0].body, new RegExp(encodeURIComponent(authCode)));
    });
  })
});
