const express = require("express")
const router = new express.Router()
const ExpressError = require("../expressError")
const db = require("../db")

router.get("/", async function (req, res) {
  const result = await db.query("SELECT id, comp_code FROM invoices;");
  return res.json({ invoices: result.rows })
})

router.get('/:id', async function (req, res, next) {
  try {

    let reqId = req.params.id
    const invoiceResult = await db.query(
      'SELECT id, amt, paid, add_date, paid_date FROM invoices WHERE id=$1;',
      [reqId]);
    if (invoiceResult.rows.length === 0) {
      throw new ExpressError('Invoice id does not exist', 404)
    }
    const companyResult = await db.query(
      'SELECT code, name, description FROM companies c JOIN invoices i ON i.comp_code = c.code WHERE i.id=$1;',
      [reqId]);

    const invoiceResponse = invoiceResult.rows[0];
    invoiceResponse.company = companyResult.rows[0];

    return res.json({ invoice: invoiceResponse });

  } catch (err) {
    return next(err);
  }
})

router.post("/", async function (req, res, next) {
  try {

    if (!req.body.comp_code || !req.body.amt) {
      throw new ExpressError('Company code and amount are required.', 404)
    }
    const result = await db.query(
      'INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date ',
      [req.body.comp_code, req.body.amt]
    );
    return res.json({ invoice: result.rows[0] });

  } catch (err) {
    return next(err);
  }
})

router.put('/:id', async function (req, res, next) {
  try {

    if (!req.params.id || !req.body.amt || req.body.amt <= 0) {
      throw new ExpressError('Invoice id and valid invoice amount are required.', 404);
    }

    const resultPaid = await db.query(
      'SELECT paid_date FROM invoices WHERE id=$1', [req.params.id]);
    const paidDate = resultPaid.rows[0].paid_date;

    let queryString = "UPDATE invoices SET amt=$1";
    if (req.body.paid === true && paidDate === null) {
      queryString += ", paid_date=CURRENT_DATE, paid=true";
    } else if (req.body.paid === false) {
      queryString += ", paid_date=null, paid=false";
    }

    const result = await db.query(
      `${queryString} WHERE id=$2 RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [req.body.amt, req.params.id]
    );
    if (result.rows.length === 0) {
      throw new ExpressError("Invoice id does doesn't exist", 404);
    }
    return res.json({ invoice: result.rows[0] });

  } catch (err) {
    return next(err);
  }
})

router.delete("/:id", async function (req, res, next) {
  try {

    const result = await db.query(
      "DELETE FROM invoices WHERE id = $1 RETURNING id", [req.params.id]
    );
    if (result.rows.length === 0) {
      throw new ExpressError("Invoice id doesn't exist", 404);
    }
    return res.json({ status: "deleted" });

  } catch (err) {
    return next(err);
  }
})

module.exports = router;