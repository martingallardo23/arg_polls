lapply(c("tidyr", "dplyr", "stringr", "rvest", "readr", "lubridate"), require, character.only=TRUE)

main <- function() {         

  tablas <- read_html("https://es.wikipedia.org/wiki/Anexo:Encuestas_de_intenci%C3%B3n_de_voto_para_las_elecciones_presidenciales_de_Argentina_de_2023") %>% 
    html_table(fill=TRUE)

  spanish_to_english_month <- function(spanish_month) {
    month_map <- c("enero" = "January", "febrero" = "February", "marzo" = "March",
                  "abril" = "April", "mayo" = "May", "junio" = "June",
                  "julio" = "July", "agosto" = "August", "septiembre" = "September",
                  "octubre" = "October", "noviembre" = "November", "diciembre" = "December")
    return(month_map[tolower(spanish_month)])
  }

  extract_and_parse_date <- function(date_text) {
    if (str_detect(date_text, "-")) {
      date_text <- str_split(date_text, "-", simplify = TRUE)[, 2]
    } else if (!str_detect(date_text, "^\\d+ de [[:alpha:]]+ de \\d{4}$")) {
      date_text <- paste("14 de", date_text)
    }
    
    date_text <- str_trim(date_text)
    spanish_month <- str_extract(date_text, "(?<=de )[[:alpha:]]+")
    english_month <- spanish_to_english_month(spanish_month)
    date_text <- str_replace(date_text, spanish_month, english_month)
    parsed_date <- dmy(date_text)
    
    return(parsed_date)
  }


  primera <- tablas[1] %>% as.data.frame() %>% 
    slice(2:nrow(.)) %>% 
    setNames(c("fecha", "encuestadora", "muestra", "fdt", "jxc",
              "lla", "fit", "cf", "otros", "blanco", "indecisos", "ventaja")) %>% 
    mutate(fecha = sapply(fecha, extract_and_parse_date) %>% as.Date(origin = "1970-01-01"),
          encuestadora = str_remove(encuestadora, "\\[.*")) |> 
    group_by(fecha, encuestadora) |> 
    mutate(id = row_number())

  segunda <- tablas[2] %>% as.data.frame() %>% 
    slice(2:nrow(.)) %>% 
    setNames(c("fecha", "encuestadora", "muestra", "fdt", "jxc",
              "lla", "fit", "otros", "blanco", "indecisos", "ventaja")) %>% 
    slice(-87)  %>% 
    mutate(fecha = sapply(fecha, extract_and_parse_date) %>% as.Date(origin = "1970-01-01"),
          encuestadora = str_remove(encuestadora, "\\[.*")) |> 
    group_by(fecha, encuestadora) |> 
    mutate(id = row_number())

  encuestas <- primera %>% 
    bind_rows(segunda) %>% 
    mutate_at(vars(4:12), ~ifelse(. == "-", NA, as.numeric(gsub(",", ".", .)))) %>% 
    mutate_at(vars(3), ~ifelse(. == "-", NA, as.numeric(gsub("\\.", "", gsub(",", ".", .))))) %>% 
    mutate(across(c(otros, blanco, indecisos), ~ ifelse(is.na(.), 0, .)),
          obi = otros+blanco+indecisos) %>% 
    select(-c(ventaja))

  encuestas <- encuestas |> 
    mutate(across(c(jxc, fdt, lla, fit, cf, otros), ~ ifelse(is.na(.), 0, .))) |> 
    rowwise() |> 
    mutate(total_valido =  sum(c(fdt + jxc + lla + fit + cf + otros))) |> 
    mutate(across(c(jxc, fdt, lla, fit, cf, otros), ~ round(100*(. / total_valido), 1)))

  encuestas <- encuestas |> 
    group_by(fecha, encuestadora, muestra) |> 
    summarise(across(c(jxc, fdt, lla, fit, cf, otros), mean))

  encuestas_long <- encuestas %>% 
    pivot_longer(cols =4:9, 
                names_to = "party", 
                values_to = "percentage_points")%>%
    mutate(party = case_when(party=="cf" ~ "Consenso Federal", 
                            party=="fdt" ~ "Frente de Todos", 
                            party=="fit" ~ "Frente de Izquierda", 
                            party=="jxc" ~ "Juntos por el Cambio", 
                            party=="lla" ~ "La Libertad Avanza", 
                            party=="otros" ~ "Otros")) %>% 
    mutate(encuestadora = gsub("\\[\\d+\\]", "", encuestadora),
          percentage_points = round(percentage_points, 2))

  encuestas_long <- encuestas_long |> 
    filter(percentage_points>0)

  write_csv(encuestas_long |> 
              filter(!is.na(percentage_points)), "data/encuestas_long.csv")
}

main()
