package io.github.nwodobe.monbudgetfamilial;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private final Map<String, ProductDetails> productCache = new HashMap<>();
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    private void withBillingReady(PluginCall call, Runnable action) {
        if (billingClient != null && billingClient.isReady()) {
            action.run();
            return;
        }
        if (billingClient == null) {
            call.reject("Google Play Billing n'est pas initialisé.");
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run();
                else call.reject("Connexion Google Play impossible: " + billingResult.getDebugMessage());
            }

            @Override
            public void onBillingServiceDisconnected() {}
        });
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        JSArray ids = call.getArray("productIds");
        if (ids == null || ids.length() == 0) {
            call.reject("Aucun produit demandé.");
            return;
        }
        withBillingReady(call, () -> {
            List<QueryProductDetailsParams.Product> requested = new ArrayList<>();
            try {
                for (Object raw : ids.toList()) {
                    if (raw instanceof String) {
                        requested.add(QueryProductDetailsParams.Product.newBuilder()
                            .setProductId((String) raw)
                            .setProductType(BillingClient.ProductType.SUBS)
                            .build());
                    }
                }
            } catch (Exception e) {
                call.reject("Liste de produits invalide.", e);
                return;
            }
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(requested).build();
            billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Offres Google Play indisponibles: " + billingResult.getDebugMessage());
                    return;
                }
                JSArray products = new JSArray();
                productCache.clear();
                for (ProductDetails details : result.getProductDetailsList()) {
                    List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
                    if (offers == null || offers.isEmpty()) continue;
                    ProductDetails.SubscriptionOfferDetails offer = offers.get(0);
                    List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                    if (phases.isEmpty()) continue;
                    ProductDetails.PricingPhase displayPhase = phases.get(phases.size() - 1);
                    productCache.put(details.getProductId(), details);
                    JSObject item = new JSObject();
                    item.put("productId", details.getProductId());
                    item.put("title", details.getTitle());
                    item.put("description", details.getDescription());
                    item.put("formattedPrice", displayPhase.getFormattedPrice());
                    item.put("offerToken", offer.getOfferToken());
                    item.put("basePlanId", offer.getBasePlanId());
                    products.put(item);
                }
                JSObject ret = new JSObject();
                ret.put("products", products);
                call.resolve(ret);
            });
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        String requestedOfferToken = call.getString("offerToken");
        String obfuscatedAccountId = call.getString("obfuscatedAccountId");
        if (productId == null || productId.isEmpty() || obfuscatedAccountId == null || obfuscatedAccountId.length() != 64) {
            call.reject("Produit ou compte Google Play invalide.");
            return;
        }
        withBillingReady(call, () -> {
            ProductDetails details = productCache.get(productId);
            if (details == null) {
                call.reject("Rechargez les offres avant l'achat.");
                return;
            }
            List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
            if (offers == null || offers.isEmpty()) {
                call.reject("Aucune offre active pour ce produit.");
                return;
            }
            ProductDetails.SubscriptionOfferDetails selected = offers.get(0);
            if (requestedOfferToken != null && !requestedOfferToken.isEmpty()) {
                for (ProductDetails.SubscriptionOfferDetails offer : offers) {
                    if (requestedOfferToken.equals(offer.getOfferToken())) selected = offer;
                }
            }
            BillingFlowParams.ProductDetailsParams productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .setOfferToken(selected.getOfferToken())
                .build();
            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(List.of(productParams))
                .setObfuscatedAccountId(obfuscatedAccountId)
                .build();
            pendingPurchaseCall = call;
            BillingResult result = billingClient.launchBillingFlow(getActivity(), flowParams);
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseCall = null;
                call.reject("Impossible d'ouvrir Google Play: " + result.getDebugMessage());
            }
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        if (call == null) return;
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            pendingPurchaseCall = null;
            call.reject("Achat annulé.");
            return;
        }
        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null || purchases.isEmpty()) {
            pendingPurchaseCall = null;
            call.reject("Achat Google Play non finalisé: " + billingResult.getDebugMessage());
            return;
        }
        for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                pendingPurchaseCall = null;
                call.resolve(purchaseToJs(purchase));
                return;
            }
        }
        pendingPurchaseCall = null;
        call.reject("Le paiement est en attente de confirmation Google Play.");
    }

    @PluginMethod
    public void restore(PluginCall call) {
        withBillingReady(call, () -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build();
            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Restauration impossible: " + billingResult.getDebugMessage());
                    return;
                }
                JSArray array = new JSArray();
                for (Purchase purchase : purchases) {
                    if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) array.put(purchaseToJs(purchase));
                }
                JSObject ret = new JSObject();
                ret.put("purchases", array);
                call.resolve(ret);
            });
        });
    }

    private JSObject purchaseToJs(Purchase purchase) {
        JSObject ret = new JSObject();
        List<String> products = purchase.getProducts();
        ret.put("productId", products.isEmpty() ? "" : products.get(0));
        ret.put("purchaseToken", purchase.getPurchaseToken());
        ret.put("orderId", purchase.getOrderId());
        ret.put("acknowledged", purchase.isAcknowledged());
        return ret;
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null) billingClient.endConnection();
        billingClient = null;
        super.handleOnDestroy();
    }
}
