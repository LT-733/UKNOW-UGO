package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lpernett/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func connect() (*pgxpool.Pool) {
	err := godotenv.Load()
	if err != nil{
		log.Fatal("You don't even have a env file man", err)
		return nil
	}
	dsn := "postgresql://" + os.Getenv("username") + ":" + os.Getenv("password") + "@" + os.Getenv("host_port") +"/defaultdb?sslmode=verify-full"
	fmt.Println(dsn)
	ctx := context.Background()
	conn, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatal("failed to connect database", err)
		return nil
	}
	// defer conn.Close(context.Background())
	return conn
}

type logininfo struct {
	Email string `form:"Email" binding:"required"`
	Password string `form:"Password" binding:"required"`
}

type userinfo struct {
	Username string `form:"Username" binding:"required"`
	Email string `form:"Email" binding:"required"`
	Password string `form:"Password" binding:"required"`
}

type searchquery struct {
	University *string `form:"University"`
	Program *string `form:"Program"`
	GPA *int16 `form:"GPA"`
}

type detailquery struct {
	University string `form:"University" binding:"required"`
	Program string `form:"Program" binding:"required"`
}

type submission struct{
	University string `form:"University" binding:"required"`
	Program string `form:"Program" binding:"required"`
	GPA sql.NullFloat64 `form:"GPA" binding:"required"`
	User string `form:"UserId" json:"UserId" binding:"required"`
}

func isloggedin(ctx *gin.Context) {
	tokenstring := ctx.GetHeader("Authorization")
	tokenstring = strings.TrimPrefix(tokenstring, "Bearer ")
	token, err := jwt.ParseWithClaims(tokenstring, &jwt.MapClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("jwt_secret")), nil
	})
	if err != nil{
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"Error": "You are not logged in!",
		})
		return
	}
	if token.Valid {ctx.Next()}
}

func getaverage(connection *pgxpool.Pool, university *string, program *string) (map[string]map[string]sql.NullFloat64, error) {
	result := make(map[string]map[string]sql.NullFloat64)
	var query string
	var args []any
	if university != nil && program != nil && *university != "" && *program != ""{
		// select university, program, avg(admission_average) from programs left join grades on programs.university=grades.university and programs.program=grades.program and grades.year=(select max(year) from grades g_sub WHERE g_sub.university = programs.university AND g_sub.program = programs.program) where similarity(university, $1) > 0.3 and similarity(program, $2) > 0.3 group by university, program
		// query = "SELECT university, program, AVG(admission_average) FROM grades WHERE similarity(university, $1) > 0.3 AND similarity(program, $2) > 0.3 and year=(SELECT MAX(year) FROM grades) GROUP BY university, program"
		query = "select programs.university, programs.program, avg(admission_average) from programs left join grades on programs.university=grades.university and programs.program=grades.program and grades.year=(select max(year) from grades g_sub WHERE g_sub.university = programs.university AND g_sub.program = programs.program) where similarity(programs.university, $1) > 0.3 and similarity(programs.program, $2) > 0.3 group by programs.university, programs.program"
		args = []any{*university, *program}
	} else if university != nil && *university != "" {
		// query = "SELECT university, program, AVG(admission_average) FROM grades WHERE similarity(university, $1) > 0.3 and year=(SELECT MAX(year) FROM grades) GROUP BY university, program"
		query = "select programs.university, programs.program, avg(admission_average) from programs left join grades on programs.university=grades.university and programs.program=grades.program and grades.year=(select max(year) from grades g_sub WHERE g_sub.university = programs.university AND g_sub.program = programs.program) where similarity(programs.university, $1) > 0.3 group by programs.university, programs.program"
		args = []any{*university}
	} else if program != nil && *program != "" {
		// query = "SELECT university, program, AVG(admission_average) FROM grades WHERE similarity(program, $1) > 0.3 and year=(SELECT MAX(year) FROM grades) GROUP BY university, program"
		query = "select programs.university, programs.program, avg(admission_average) from programs left join grades on programs.university=grades.university and programs.program=grades.program and grades.year=(select max(year) from grades g_sub WHERE g_sub.university = programs.university AND g_sub.program = programs.program) where similarity(programs.program, $1) > 0.3 group by programs.university, programs.program"
		args = []any{*program}
	} else {
		// query = "SELECT university, program, AVG(admission_average) FROM grades where year=(SELECT MAX(year) FROM grades) GROUP BY university, program"
		query = "select programs.university, programs.program, avg(admission_average) from programs left join grades on programs.university=grades.university and programs.program=grades.program and grades.year=(select max(year) from grades g_sub WHERE g_sub.university = programs.university AND g_sub.program = programs.program) group by programs.university, programs.program"
		args = []any{}
	}
	rows, err := connection.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var uni string
		var prog string
		var avg sql.NullFloat64
		err = rows.Scan(&uni, &prog, &avg)
		if err != nil {
			return nil, err
		}
		if result[uni] == nil {
			result[uni] = make(map[string]sql.NullFloat64)
		}
		result[uni][prog] = avg
	}
	// fmt.Print(result)
	return result, nil
}

func main()  {
	connection := connect()
	if connection == nil {
		log.Fatal("It's jover little bro. Your database is cooked")
	}
	r := gin.Default()
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AddAllowHeaders("Authorization")
	r.Use(cors.New(config))
	r.POST("/auth", func(ctx *gin.Context) {
		var login_request logininfo
		if err := ctx.ShouldBind(&login_request); err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		var password_in_db []byte
		var user string
		err := connection.QueryRow(ctx, "select password_hashed, username from users where email=$1", login_request.Email).Scan(&password_in_db, &user)
		if err != nil{
			bcrypt.CompareHashAndPassword([]byte("$2a$10$abcdefghijklmnopqrstuu"), []byte(login_request.Password))
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"Error: ": "your email or password is wrong",
			})
			return
		}
		err = bcrypt.CompareHashAndPassword(password_in_db, []byte(login_request.Password))
		if err != nil{
			// log.Fatal("User's password is wrong", err)
			// bcrypt.CompareHashAndPassword([]byte("$2a$10$abcdefghijklmnopqrstuu"), []byte(login_request.Password))
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"Error: ": "your email or password is wrong",
			})
			return
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub": user,
			"exp": time.Now().Add(time.Hour).Unix(),
			"iat": time.Now().Unix(),
			"iss": "The UKNOW server",
		})
		tokenstring, err := token.SignedString([]byte(os.Getenv("jwt_secret")))
		if err != nil{
			// bcrypt.CompareHashAndPassword([]byte("$2a$10$abcdefghijklmnopqrstuu"), []byte(login_request.Password))
			ctx.JSON(http.StatusContinue, gin.H{
				"Error": "tokenstring failed idk what the fuck is going on",
			})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{
			"Message": "Logged In",
			"token": tokenstring,
		})
	} )

	r.POST("/register", func(ctx *gin.Context) {
		var register_request userinfo
		if err := ctx.ShouldBind(&register_request); err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		if len(register_request.Password) < 8{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": "Password too short",
			})
			return
		}
		if _, err := mail.ParseAddress(register_request.Email); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": "Not an email",
			})
			return
		}
		hashedpassword, err := bcrypt.GenerateFromPassword([]byte(register_request.Password), 14)
		if err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": "Hashing failed idk what the fuck is going on",
			})
			return
		}
		_, err = connection.Exec(ctx, "insert into users (username, email, password_hashed) values ($1, $2, $3)", register_request.Username, register_request.Email, hashedpassword)
		if err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": "Cannot insert username/email/password into database. Maybe the username or email already exists.",
			})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{
			"Message": "Account Created",
		})
	})

	r.GET("/results", func(ctx *gin.Context) {
		var userquery searchquery
		if err := ctx.ShouldBindQuery(&userquery); err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		// gradeList := make(map[string]map[string]sql.NullFloat64)
		gradeList, err := getaverage(connection, userquery.University, userquery.Program);
		if err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{
			"Search Results": gradeList,
		})
	})

	r.GET("/details", func(ctx *gin.Context) {
		var programquery detailquery
		if err := ctx.ShouldBindQuery(&programquery); err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		var args []any
		query := "select year, admission_average from grades where university=$1 and program=$2 order by year"
		args = append(args, programquery.University, programquery.Program)
		rows, err := connection.Query(ctx, query, args...)
		if err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		type pair struct{
			Year int
			GPA float32
		}
		defer rows.Close()
		var results []pair
		for rows.Next(){
			var yr int
			var grade float32
			err = rows.Scan(&yr, &grade)
			if err != nil{
				ctx.JSON(http.StatusBadRequest, gin.H{
					"Error": err.Error(),
				})
				return
			}
			results = append(results, pair{yr, grade})
		}
		ctx.JSON(http.StatusOK, gin.H{
			"Results": results,
		})
	})

	r.GET("/universities", func(ctx *gin.Context) {
		var Universities []string

		query := "select distinct university from programs"
		rows, err := connection.Query(ctx, query)
		if err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		defer rows.Close()
		for rows.Next(){
			var uni string
			err = rows.Scan(&uni)
			if err != nil{
				ctx.JSON(http.StatusBadRequest, gin.H{
					"Error": err.Error(),
				})
				return
			}
			Universities = append(Universities, uni)
		}
		ctx.JSON(http.StatusOK, gin.H{
			"Universities": Universities,
		})
	})

	r.GET("/programs", func(ctx *gin.Context) {
		university := ctx.Query("University")
		var Programs []string

		query := "select program from programs where university=$1"
		rows, err := connection.Query(ctx, query, university)
		if err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		defer rows.Close()
		for rows.Next(){
			var program string
			err = rows.Scan(&program)
			if err != nil{
				ctx.JSON(http.StatusBadRequest, gin.H{
					"Error": err.Error(),
				})
				return
			}
			Programs = append(Programs, program)
		}
		ctx.JSON(http.StatusOK, gin.H{
			"Programs": Programs,
		})
	})

	r.GET("/ping", func (c *gin.Context)  {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong!",
		})
	})

	r.Use(isloggedin)
	r.POST("/submit", func(ctx *gin.Context) {
		var submit_request submission
		if err := ctx.ShouldBind(&submit_request); err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		query := "insert into grades (year, university, program, admission_average, user_id) select $1, $2, $3, $4, $5 from programs where university=$2 and program=$3"
		status, err := connection.Exec(ctx, query, time.Now().Year(), submit_request.University, submit_request.Program, submit_request.GPA, submit_request.User)
		if err != nil{
			ctx.JSON(http.StatusBadRequest, gin.H{
				"Error": err.Error(),
			})
			return
		}
		ctx.JSON(http.StatusAccepted, gin.H{
			"Status": status,
		})
	})

	r.Run()
}