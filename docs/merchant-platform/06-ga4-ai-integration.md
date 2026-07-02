# GA4 + AI Recommendation Architecture

## GA4 Events
- page_view
- product_view
- search_query
- whatsapp_click
- seller_profile_view
- contact_seller
- favorite_product
- returning_user
- city_location
- device_type
- traffic_source

## Event Payload Example
```json
{
  "event": "product_view",
  "seller_id": "biz_123",
  "product_id": "prod_456",
  "category": "Electrical",
  "city": "Lucknow",
  "device_type": "mobile",
  "traffic_source": "organic"
}
```

## Story Translation Layer
Convert analytics into plain-language summaries:
- Your products were viewed 1,280 times this week.
- Most buyers came from Lucknow.
- Electrical products received the highest interest.
- WhatsApp inquiries increased by 21%.

## Marketplace Copilot
Inputs:
- Product views and inquiry velocity
- Stock trend and lead times
- Response-time behavior
- City and category demand

Outputs:
- Trend alert
- Restock forecast
- Action recommendation
- Messaging tip

## Copilot Prompt Contract
- Keep each recommendation under 120 characters.
- Include reason and next action.
- Never use technical analytics terms.
- Prioritize one clear action at a time.

## Pipeline
1. Ingest GA4 events
2. Aggregate daily seller metrics
3. Build natural-language insight summaries
4. Generate recommendations via AI service
5. Store recommendations per seller and render in Home card
