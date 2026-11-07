package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	db         *gorm.DB
	jwtSecret  = []byte(getenv("JWT_SECRET", "change-this-secret-before-deploying"))
	categories = []string{"Books and Notes", "Electronics", "Stationery", "Hostel Essentials", "Clothing", "Cycles and Sports", "Other Items"}
	conditions = []string{"New", "Good", "Fair"}
)

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `json:"name"`
	Email        string    `gorm:"uniqueIndex" json:"email"`
	PasswordHash string    `json:"-"`
	CollegeName  string    `json:"college_name"`
	CreatedAt    time.Time `json:"created_at"`
}

type Product struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	UserID        uint      `gorm:"index" json:"user_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Price         float64   `json:"price"`
	Category      string    `json:"category"`
	Condition     string    `json:"condition"`
	ImageURL      string    `json:"image_url"`
	Contact       string    `json:"contact"`
	Status        string    `gorm:"default:Available" json:"status"`
	IsDemo        bool      `json:"is_demo"`
	CreatedAt     time.Time `json:"created_at"`
	SellerName    string    `gorm:"-" json:"seller_name"`
	SellerCollege string    `gorm:"-" json:"seller_college"`
}

type productInput struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Category    string  `json:"category"`
	Condition   string  `json:"condition"`
	ImageURL    string  `json:"image_url"`
	Contact     string  `json:"contact"`
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func fail(c *gin.Context, code int, msg string) {
	c.AbortWithStatusJSON(code, gin.H{"error": msg})
}

func contains(list []string, v string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

func makeToken(uid uint) string {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": uid, "exp": time.Now().Add(7 * 24 * time.Hour).Unix()})
	s, _ := t.SignedString(jwtSecret)
	return s
}

func auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		raw := strings.TrimPrefix(h, "Bearer ")
		if raw == "" || raw == h {
			fail(c, 401, "Please log in to continue.")
			return
		}
		tok, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) { return jwtSecret, nil }, jwt.WithValidMethods([]string{"HS256"}))
		if err != nil || !tok.Valid {
			fail(c, 401, "Your session has expired. Please log in again.")
			return
		}
		id, _ := tok.Claims.(jwt.MapClaims)["sub"].(float64)
		c.Set("uid", uint(id))
		c.Next()
	}
}

// ---------- auth handlers ----------

func register(c *gin.Context) {
	var in struct{ Name, Email, Password, CollegeName string }
	var raw struct {
		Name        string `json:"name"`
		Email       string `json:"email"`
		Password    string `json:"password"`
		CollegeName string `json:"college_name"`
	}
	if c.ShouldBindJSON(&raw) != nil {
		fail(c, 400, "Invalid request.")
		return
	}
	in.Name, in.Email, in.Password, in.CollegeName = strings.TrimSpace(raw.Name), strings.ToLower(strings.TrimSpace(raw.Email)), raw.Password, strings.TrimSpace(raw.CollegeName)
	if in.Name == "" || !strings.Contains(in.Email, "@") || len(in.Password) < 6 {
		fail(c, 400, "Enter your name, a valid email and a password of at least 6 characters.")
		return
	}
	if in.CollegeName == "" {
		in.CollegeName = "SMIT"
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	u := User{Name: in.Name, Email: in.Email, PasswordHash: string(hash), CollegeName: in.CollegeName}
	if err := db.Create(&u).Error; err != nil {
		fail(c, 409, "An account with this email already exists.")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"token": makeToken(u.ID), "user": u})
}

func login(c *gin.Context) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if c.ShouldBindJSON(&in) != nil {
		fail(c, 400, "Invalid request.")
		return
	}
	var u User
	if db.Where("email = ?", strings.ToLower(strings.TrimSpace(in.Email))).First(&u).Error != nil ||
		bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(in.Password)) != nil {
		fail(c, 401, "Email or password is incorrect.")
		return
	}
	c.JSON(200, gin.H{"token": makeToken(u.ID), "user": u})
}

func me(c *gin.Context) {
	var u User
	if db.First(&u, c.GetUint("uid")).Error != nil {
		fail(c, 401, "Account not found.")
		return
	}
	c.JSON(200, u)
}

// ---------- product handlers ----------

func fill(ps []Product) {
	ids := []uint{}
	for _, p := range ps {
		ids = append(ids, p.UserID)
	}
	if len(ids) == 0 {
		return
	}
	var us []User
	db.Find(&us, ids)
	m := map[uint]User{}
	for _, u := range us {
		m[u.ID] = u
	}
	for i := range ps {
		ps[i].SellerName, ps[i].SellerCollege = m[ps[i].UserID].Name, m[ps[i].UserID].CollegeName
	}
}

func validate(in *productInput) string {
	in.Name, in.Contact, in.Description = strings.TrimSpace(in.Name), strings.TrimSpace(in.Contact), strings.TrimSpace(in.Description)
	switch {
	case len(in.Name) < 3:
		return "Product name must be at least 3 characters."
	case len(in.Name) > 80:
		return "Product name must be 80 characters or fewer."
	case len(in.Description) > 1000:
		return "Description must be 1000 characters or fewer."
	case in.Price > 1000000:
		return "Price looks too high. Please check it."
	case in.Price <= 0:
		return "Enter a price greater than ₹0."
	case !contains(categories, in.Category):
		return "Choose a category."
	case !contains(conditions, in.Condition):
		return "Choose the item condition."
	case in.Contact == "":
		return "Add a phone number or email so buyers can reach you."
	}
	return ""
}

func listProducts(c *gin.Context) {
	q := db.Model(&Product{}).Where("status = ?", "Available")
	if s := strings.TrimSpace(c.Query("q")); s != "" {
		q = q.Where("LOWER(name) LIKE ?", "%"+strings.ToLower(s)+"%")
	}
	if v := c.Query("category"); v != "" {
		q = q.Where("category = ?", v)
	}
	if v, err := strconv.ParseFloat(c.Query("min"), 64); err == nil {
		q = q.Where("price >= ?", v)
	}
	if v, err := strconv.ParseFloat(c.Query("max"), 64); err == nil {
		q = q.Where("price <= ?", v)
	}
	q = q.Session(&gorm.Session{})
	var total int64
	q.Count(&total)
	c.Header("X-Total-Count", strconv.FormatInt(total, 10))
	switch c.Query("sort") {
	case "price_asc":
		q = q.Order("price asc")
	case "price_desc":
		q = q.Order("price desc")
	default:
		q = q.Order("created_at desc, id desc")
	}
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 48 {
		limit = 12
	}
	ps := []Product{}
	q.Limit(limit).Offset((page - 1) * limit).Find(&ps)
	fill(ps)
	c.JSON(200, ps)
}

func getProduct(c *gin.Context) {
	var p Product
	if db.First(&p, c.Param("id")).Error != nil {
		fail(c, 404, "Listing not found.")
		return
	}
	ps := []Product{p}
	fill(ps)
	c.JSON(200, ps[0])
}

func createProduct(c *gin.Context) {
	var in productInput
	if c.ShouldBindJSON(&in) != nil {
		fail(c, 400, "Invalid request.")
		return
	}
	if m := validate(&in); m != "" {
		fail(c, 400, m)
		return
	}
	p := Product{UserID: c.GetUint("uid"), Name: in.Name, Description: in.Description, Price: in.Price, Category: in.Category,
		Condition: in.Condition, ImageURL: in.ImageURL, Contact: in.Contact, Status: "Available"}
	db.Create(&p)
	c.JSON(201, p)
}

// owned loads a product and makes sure the logged-in user owns it.
func owned(c *gin.Context) (Product, bool) {
	var p Product
	if db.First(&p, c.Param("id")).Error != nil {
		fail(c, 404, "Listing not found.")
		return p, false
	}
	if p.UserID != c.GetUint("uid") {
		fail(c, 403, "You can only change your own listings.")
		return p, false
	}
	return p, true
}

func updateProduct(c *gin.Context) {
	p, ok := owned(c)
	if !ok {
		return
	}
	var in productInput
	if c.ShouldBindJSON(&in) != nil {
		fail(c, 400, "Invalid request.")
		return
	}
	if m := validate(&in); m != "" {
		fail(c, 400, m)
		return
	}
	p.Name, p.Description, p.Price, p.Category, p.Condition, p.ImageURL, p.Contact = in.Name, in.Description, in.Price, in.Category, in.Condition, in.ImageURL, in.Contact
	db.Save(&p)
	c.JSON(200, p)
}

func deleteProduct(c *gin.Context) {
	p, ok := owned(c)
	if !ok {
		return
	}
	db.Delete(&p)
	c.JSON(200, gin.H{"message": "Listing deleted."})
}

func setStatus(c *gin.Context) {
	p, ok := owned(c)
	if !ok {
		return
	}
	var in struct {
		Status string `json:"status"`
	}
	if c.ShouldBindJSON(&in) != nil || !contains([]string{"Available", "Sold"}, in.Status) {
		fail(c, 400, "Status must be Available or Sold.")
		return
	}
	p.Status = in.Status
	db.Save(&p)
	c.JSON(200, p)
}

func myProducts(c *gin.Context) {
	ps := []Product{}
	db.Where("user_id = ?", c.GetUint("uid")).Order("created_at desc").Find(&ps)
	fill(ps)
	c.JSON(200, ps)
}

func upload(c *gin.Context) {
	f, err := c.FormFile("image")
	if err != nil || f.Size > 3<<20 {
		fail(c, 400, "Choose an image smaller than 3 MB.")
		return
	}
	ext := strings.ToLower(filepath.Ext(f.Filename))
	if !contains([]string{".jpg", ".jpeg", ".png", ".webp", ".gif"}, ext) {
		fail(c, 400, "Use a JPG, PNG, WEBP or GIF image.")
		return
	}
	src, err := f.Open()
	if err != nil {
		fail(c, 400, "Could not read the image.")
		return
	}
	buf := make([]byte, 512)
	n, _ := src.Read(buf)
	src.Close()
	if !strings.HasPrefix(http.DetectContentType(buf[:n]), "image/") {
		fail(c, 400, "That file is not a valid image.")
		return
	}
	os.MkdirAll("uploads", 0o755)
	name := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	if c.SaveUploadedFile(f, filepath.Join("uploads", name)) != nil {
		fail(c, 500, "Could not save the image.")
		return
	}
	c.JSON(200, gin.H{"url": "/uploads/" + name})
}

// ---------- demo data ----------

func seed() {
	var n int64
	db.Model(&Product{}).Count(&n)
	if n > 0 {
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte("demo1234"), bcrypt.DefaultCost)
	u := User{Name: "Demo Seller", Email: "demo@smitmarket.local", PasswordHash: string(hash), CollegeName: "SMIT"}
	db.Create(&u)
	demo := []Product{
		{Name: "Engineering Mathematics Notes (Sem 3)", Description: "Handwritten, neat notes with solved previous-year questions.", Price: 150, Category: "Books and Notes", Condition: "Good"},
		{Name: "Scientific Calculator fx-991", Description: "Works perfectly. Cover included.", Price: 650, Category: "Electronics", Condition: "Good"},
		{Name: "Hostel Study Lamp", Description: "LED lamp with adjustable neck, 3 brightness levels.", Price: 300, Category: "Hostel Essentials", Condition: "Fair"},
		{Name: "Hero Sprint Cycle", Description: "Used for one year, recently serviced.", Price: 2800, Category: "Cycles and Sports", Condition: "Good"},
	}
	for _, p := range demo {
		p.UserID, p.Contact, p.Status, p.IsDemo = u.ID, "9876543210", "Available", true
		p.Description = "DEMO LISTING. " + p.Description
		db.Create(&p)
	}
}

func main() {
	var err error
	db, err = gorm.Open(sqlite.Open("smitmarket.db"), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	db.AutoMigrate(&User{}, &Product{})
	seed()
	if os.Getenv("JWT_SECRET") == "" {
		fmt.Println("WARNING: JWT_SECRET is not set. Using an insecure development secret.")
	}

	r := gin.Default()
	r.Use(securityHeaders())
	r.MaxMultipartMemory = 4 << 20
	r.Static("/uploads", "./uploads")
	api := r.Group("/api")
	api.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	api.POST("/register", rateLimit(10, time.Minute), register)
	api.POST("/login", rateLimit(10, time.Minute), login)
	api.GET("/products", listProducts)
	api.GET("/products/:id", getProduct)

	p := api.Group("", auth())
	p.GET("/me", me)
	p.GET("/my-products", myProducts)
	p.POST("/products", createProduct)
	p.PUT("/products/:id", updateProduct)
	p.DELETE("/products/:id", deleteProduct)
	p.PATCH("/products/:id/status", setStatus)
	p.POST("/upload", upload)

	r.Run(":8080")
}
