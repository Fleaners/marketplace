import * as admin from 'firebase-admin';
import pkg from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const { Pool } = pkg;

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (serviceAccountPath) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  admin.initializeApp();
}

const db = admin.firestore();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Migrate businesses from PostgreSQL to Firestore
 */
async function migrateBusinesses() {
  try {
    console.log('Starting businesses migration...');
    const result = await pool.query('SELECT * FROM businesses;');
    const businesses = result.rows;

    console.log(`Found ${businesses.length} businesses to migrate`);

    for (const business of businesses) {
      await db.collection('businesses').doc(String(business.id)).set({
        shop_name: business.shop_name,
        phone: business.phone,
        email: business.email ? business.email.toLowerCase() : null,
        password_hash: business.password_hash,
        gst_number: business.gst_number,
        city: business.city,
        latitude: business.latitude,
        longitude: business.longitude,
        profile_image_url: business.profile_image_url,
        description: business.description,
        created_at: business.created_at ? new Date(business.created_at) : admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✓ Migrated business: ${business.shop_name}`);
    }

    console.log('✓ Businesses migration completed');
    return businesses.length;
  } catch (error) {
    console.error('Error migrating businesses:', error);
    throw error;
  }
}

/**
 * Migrate products from PostgreSQL to Firestore
 */
async function migrateProducts(businesses) {
  try {
    console.log('Starting products migration...');
    const result = await pool.query('SELECT * FROM products;');
    const products = result.rows;

    console.log(`Found ${products.length} products to migrate`);

    for (const product of products) {
      const businessId = String(product.business_id);
      
      // Check if business exists
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      if (!businessDoc.exists) {
        console.warn(`⚠ Skipping product ${product.id}: business ${businessId} not found`);
        continue;
      }

      await db
        .collection('businesses')
        .doc(businessId)
        .collection('products')
        .doc(String(product.id))
        .set({
          name: product.name,
          description: product.description,
          price: parseFloat(product.price) || 0,
          cost_price: parseFloat(product.cost_price) || 0,
          stock: parseInt(product.stock) || 0,
          image_url: product.image_url,
          created_at: product.created_at ? new Date(product.created_at) : admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(`✓ Migrated product: ${product.name}`);
    }

    console.log('✓ Products migration completed');
    return products.length;
  } catch (error) {
    console.error('Error migrating products:', error);
    throw error;
  }
}

/**
 * Migrate posts from PostgreSQL to Firestore
 */
async function migratePosts() {
  try {
    console.log('Starting posts migration...');
    const result = await pool.query('SELECT * FROM posts;');
    const posts = result.rows;

    console.log(`Found ${posts.length} posts to migrate`);

    for (const post of posts) {
      const businessId = String(post.business_id);

      const businessDoc = await db.collection('businesses').doc(businessId).get();
      if (!businessDoc.exists) {
        console.warn(`⚠ Skipping post ${post.id}: business ${businessId} not found`);
        continue;
      }

      await db
        .collection('businesses')
        .doc(businessId)
        .collection('posts')
        .doc(String(post.id))
        .set({
          content: post.content,
          image_url: post.image_url,
          created_at: post.created_at ? new Date(post.created_at) : admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(`✓ Migrated post from business: ${businessId}`);
    }

    console.log('✓ Posts migration completed');
    return posts.length;
  } catch (error) {
    console.error('Error migrating posts:', error);
    throw error;
  }
}

/**
 * Migrate invoices from PostgreSQL to Firestore
 */
async function migrateInvoices() {
  try {
    console.log('Starting invoices migration...');
    const result = await pool.query('SELECT * FROM invoices;');
    const invoices = result.rows;

    console.log(`Found ${invoices.length} invoices to migrate`);

    for (const invoice of invoices) {
      const businessId = String(invoice.business_id);

      const businessDoc = await db.collection('businesses').doc(businessId).get();
      if (!businessDoc.exists) {
        console.warn(`⚠ Skipping invoice ${invoice.id}: business ${businessId} not found`);
        continue;
      }

      // Create invoice document
      const invoiceRef = await db
        .collection('businesses')
        .doc(businessId)
        .collection('invoices')
        .doc(String(invoice.id));

      await invoiceRef.set({
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone,
        subtotal: parseFloat(invoice.subtotal) || 0,
        gst_amount: parseFloat(invoice.gst_amount) || 0,
        total: parseFloat(invoice.total) || 0,
        created_at: invoice.created_at ? new Date(invoice.created_at) : admin.firestore.FieldValue.serverTimestamp(),
      });

      // Migrate invoice items
      const itemsResult = await pool.query(
        'SELECT * FROM invoice_items WHERE invoice_id = $1',
        [invoice.id]
      );

      for (const item of itemsResult.rows) {
        await invoiceRef.collection('items').doc(String(item.id)).set({
          product_id: item.product_id ? String(item.product_id) : null,
          description: item.description,
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
        });
      }

      console.log(`✓ Migrated invoice: ${invoice.id} with ${itemsResult.rows.length} items`);
    }

    console.log('✓ Invoices migration completed');
    return invoices.length;
  } catch (error) {
    console.error('Error migrating invoices:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function main() {
  try {
    console.log('🚀 Starting Firebase migration...\n');

    // Verify database connection
    const testQuery = await pool.query('SELECT COUNT(*) FROM businesses;');
    console.log(`✓ Connected to PostgreSQL. Found ${testQuery.rows[0].count} businesses\n`);

    // Run migrations in order
    const businessCount = await migrateBusinesses();
    console.log('');
    
    const productCount = await migrateProducts();
    console.log('');
    
    const postCount = await migratePosts();
    console.log('');
    
    const invoiceCount = await migrateInvoices();

    console.log('\n✅ Migration completed!');
    console.log(`Summary:`);
    console.log(`  - Businesses: ${businessCount}`);
    console.log(`  - Products: ${productCount}`);
    console.log(`  - Posts: ${postCount}`);
    console.log(`  - Invoices: ${invoiceCount}`);
    console.log('\n📝 All data has been migrated to Firestore.');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// Run migration
main();
